using System.Text.Json;
using System.Globalization;
using Merchello.Core.Accounting.Extensions;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Discounts.Models;
using Merchello.Core.Discounts.Services;
using Merchello.Core.Discounts.Services.Interfaces;
using Merchello.Core.Notifications.CheckoutNotifications;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Shared.RateLimiting.Interfaces;
using Merchello.Core.Shipping.Extensions;
using Merchello.Core.Warehouses.Services.Interfaces;
using Microsoft.Extensions.Options;

namespace Merchello.Core.Checkout.Services;

public class CheckoutDiscountService(
    ILineItemService lineItemService,
    IMerchelloNotificationPublisher notificationPublisher,
    IOptions<MerchelloSettings> settings,
    IRateLimiter rateLimiter,
    Lazy<ICheckoutService> checkoutService,
    ICheckoutSessionService? checkoutSessionService = null,
    IWarehouseService? warehouseService = null,
    IDiscountEngine? discountEngine = null,
    IDiscountService? discountService = null,
    IAbandonedCheckoutService? abandonedCheckoutService = null) : ICheckoutDiscountService
{
    private const int MAX_DISCOUNT_CODE_ATTEMPTS_PER_MINUTE = 5;
    private static readonly TimeSpan DiscountCodeRateLimitWindow = TimeSpan.FromMinutes(1);

    private readonly MerchelloSettings _settings = settings.Value;

    /// <inheritdoc />
    public async Task AddDiscountToBasketAsync(
        AddDiscountToBasketParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var basket = parameters.Basket;
        var amount = parameters.Amount;
        var discountValueType = parameters.DiscountValueType;
        var linkedSku = parameters.LinkedSku;
        var name = parameters.Name;
        var reason = parameters.Reason;
        var countryCode = parameters.CountryCode;

        var currencyCode = _settings.StoreCurrencyCode;
        var errors = lineItemService.AddDiscountLineItem(new AddDiscountLineItemParameters
        {
            LineItems = basket.LineItems,
            Amount = amount,
            DiscountValueType = discountValueType,
            CurrencyCode = currencyCode,
            LinkedSku = linkedSku,
            Name = name,
            Reason = reason
        });

        basket.Errors = errors.Select(x => new BasketError { Message = x }).ToList();
        if (basket.Errors.Count > 0)
        {
            return;
        }

        await checkoutService.Value.CalculateBasketAsync(new CalculateBasketParameters { Basket = basket, CountryCode = countryCode }, cancellationToken);
        basket.DateUpdated = DateTime.UtcNow;
    }

    /// <inheritdoc />
    public async Task RemoveDiscountFromBasketAsync(
        Basket basket,
        Guid discountLineItemId,
        string? countryCode = null,
        CancellationToken cancellationToken = default)
    {
        // Find the discount line item BEFORE removing to get discount info for notification
        var discountLineItem = basket.LineItems.FirstOrDefault(li =>
            li.Id == discountLineItemId && li.LineItemType == LineItemType.Discount);

        if (discountLineItem == null)
        {
            basket.Errors.Add(new BasketError
            {
                Message = "Discount line item not found",
                RelatedLineItemId = discountLineItemId
            });
            return;
        }

        // Get the discount ID from ExtendedData to look up the discount for notification
        Discount? discount = null;
        if (discountLineItem.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountId, out var discountIdObj) &&
            Guid.TryParse(discountIdObj.UnwrapJsonElement()?.ToString(), out var discountId) &&
            discountService != null)
        {
            discount = await discountService.GetByIdAsync(discountId, cancellationToken);
        }

        // Remove the line item
        basket.LineItems.Remove(discountLineItem);

        // Publish notification if we have the discount info
        if (discount != null)
        {
            await notificationPublisher.PublishAsync(
                new DiscountCodeRemovedNotification(basket, discount),
                cancellationToken);
        }

        await checkoutService.Value.CalculateBasketAsync(new CalculateBasketParameters { Basket = basket, CountryCode = countryCode }, cancellationToken);
        basket.DateUpdated = DateTime.UtcNow;
    }

    /// <inheritdoc />
    public async Task<CrudResult<Basket>> ApplyDiscountCodeAsync(
        Basket basket,
        string code,
        string? countryCode = null,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Basket>();

        if (discountEngine == null || discountService == null)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = "Discount engine not configured.",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        // Rate limiting: Check if too many discount code attempts
        var rateLimitResult = await CheckDiscountCodeRateLimitAsync(basket.Id);
        if (!rateLimitResult.Allowed)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = rateLimitResult.ErrorMessage ?? "Too many discount code attempts. Please try again later.",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        // Build discount context from basket
        var context = await BuildDiscountContextAsync(basket, cancellationToken);

        // Validate the code
        var validationResult = await discountEngine.ValidateCodeAsync(code, context, cancellationToken);
        if (!validationResult.IsValid)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = validationResult.ErrorMessage ?? "Invalid discount code.",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        var discount = validationResult.Discount!;

        // Publish "Before" notification - handlers can cancel
        var applyingNotification = new DiscountCodeApplyingNotification(basket, code);
        if (await notificationPublisher.PublishCancelableAsync(applyingNotification, cancellationToken))
        {
            result.Messages.Add(new ResultMessage
            {
                Message = applyingNotification.CancelReason ?? "Discount code application cancelled.",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        // Calculate the discount
        var calculationResult = await discountEngine.CalculateAsync(discount, context, cancellationToken);
        if (!calculationResult.Success || calculationResult.TotalDiscountAmount <= 0)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = calculationResult.ErrorMessage ?? "Discount does not apply to items in your cart.",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        var errors = AddCalculatedDiscountLineItems(
            basket,
            discount,
            calculationResult,
            isAutomatic: false,
            discountCode: discount.Code);

        if (errors.Count > 0)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = errors.First(),
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        await checkoutService.Value.CalculateBasketAsync(new CalculateBasketParameters { Basket = basket, CountryCode = countryCode }, cancellationToken);

        // Recompute promotional discounts so combination/priority rules are respected after code application.
        var refreshResult = await RefreshPromotionalDiscountsAsync(basket, countryCode, cancellationToken);
        basket = refreshResult.ResultObject ?? basket;
        result.Messages.AddRange(refreshResult.Messages);
        basket.DateUpdated = DateTime.UtcNow;

        // Publish "After" notification
        await notificationPublisher.PublishAsync(new DiscountCodeAppliedNotification(basket, discount), cancellationToken);

        // Track checkout activity for abandoned cart recovery
        if (abandonedCheckoutService != null)
        {
            await abandonedCheckoutService.TrackCheckoutActivityAsync(basket.Id, cancellationToken);
        }

        result.ResultObject = basket;
        return result;
    }

    /// <inheritdoc />
    public async Task<List<ApplicableDiscount>> GetApplicableAutomaticDiscountsAsync(
        Basket basket,
        CancellationToken cancellationToken = default)
    {
        if (discountEngine == null)
        {
            return [];
        }

        var context = await BuildDiscountContextAsync(basket, cancellationToken);
        return await discountEngine.GetApplicableAutomaticDiscountsAsync(context, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<CrudResult<Basket>> RefreshPromotionalDiscountsAsync(
        Basket basket,
        string? countryCode = null,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Basket>();

        if (discountEngine == null)
        {
            result.ResultObject = basket;
            return result;
        }

        var persistedCodeDiscounts = SnapshotPersistedCodeDiscounts(basket);

        // Remove existing promotional discount lines before revalidation/reapplication.
        var promotionalDiscountLineItems = basket.LineItems
            .Where(li => li.LineItemType == LineItemType.Discount &&
                         li.ExtendedData.ContainsKey(Constants.ExtendedDataKeys.DiscountId))
            .ToList();

        foreach (var lineItem in promotionalDiscountLineItems)
        {
            basket.LineItems.Remove(lineItem);
        }

        await checkoutService.Value.CalculateBasketAsync(new CalculateBasketParameters
        {
            Basket = basket,
            CountryCode = countryCode,
            ShippingAmountOverride = basket.Shipping
        }, cancellationToken);

        // Revalidate persisted code discounts.
        var validCodeDiscounts = new List<Discount>();
        var codeByDiscountId = new Dictionary<Guid, string>();
        foreach (var persistedCode in persistedCodeDiscounts)
        {
            var currentContext = await BuildDiscountContextAsync(basket, cancellationToken);
            var validationResult = await discountEngine.ValidateCodeAsync(
                persistedCode.Code,
                currentContext,
                cancellationToken);

            if (!validationResult.IsValid || validationResult.Discount == null)
            {
                result.AddWarningMessage(validationResult.ErrorMessage ??
                    $"Discount code '{persistedCode.Code}' is no longer valid and was removed.");
                continue;
            }

            if (codeByDiscountId.ContainsKey(validationResult.Discount.Id))
            {
                continue;
            }

            codeByDiscountId[validationResult.Discount.Id] = persistedCode.Code;
            validCodeDiscounts.Add(validationResult.Discount);
        }

        // Gather currently applicable automatic discounts and resolve full combination filtering once.
        var baseContext = await BuildDiscountContextAsync(basket, cancellationToken);
        var automaticDiscounts = (await discountEngine.GetApplicableAutomaticDiscountsAsync(baseContext, cancellationToken))
            .Select(x => x.Discount)
            .ToList();

        var candidateDiscounts = validCodeDiscounts
            .Concat(automaticDiscounts)
            .ToList();

        var filteredDiscounts = discountEngine.FilterCombinableDiscounts(candidateDiscounts);
        var filteredDiscountIds = filteredDiscounts.Select(d => d.Id).ToHashSet();

        foreach (var removedCodeDiscount in validCodeDiscounts.Where(d => !filteredDiscountIds.Contains(d.Id)))
        {
            if (codeByDiscountId.TryGetValue(removedCodeDiscount.Id, out var code))
            {
                result.AddWarningMessage(
                    $"Discount code '{code}' could not be combined with other discounts and was removed.");
            }
        }

        // Apply selected discounts in priority order with running subtotal (matches engine semantics).
        var runningSubTotal = baseContext.SubTotal;
        foreach (var discount in filteredDiscounts)
        {
            var calculationContext = await BuildDiscountContextAsync(basket, cancellationToken);
            calculationContext.SubTotal = runningSubTotal;

            var calculationResult = await discountEngine.CalculateAsync(discount, calculationContext, cancellationToken);
            if (!calculationResult.Success || calculationResult.TotalDiscountAmount <= 0)
            {
                continue;
            }

            var isAutomatic = !codeByDiscountId.ContainsKey(discount.Id);
            codeByDiscountId.TryGetValue(discount.Id, out var code);
            var addErrors = AddCalculatedDiscountLineItems(
                basket,
                discount,
                calculationResult,
                isAutomatic,
                code);
            if (addErrors.Count > 0)
            {
                result.AddWarningMessage(addErrors.First());
                continue;
            }

            if (discount.Category == DiscountCategory.AmountOffOrder)
            {
                runningSubTotal = Math.Max(0, runningSubTotal - calculationResult.OrderDiscountAmount);
            }
            else if (discount.Category is DiscountCategory.AmountOffProducts or DiscountCategory.BuyXGetY)
            {
                runningSubTotal = Math.Max(0, runningSubTotal - calculationResult.ProductDiscountAmount);
            }
        }

        await checkoutService.Value.CalculateBasketAsync(new CalculateBasketParameters
        {
            Basket = basket,
            CountryCode = countryCode,
            ShippingAmountOverride = basket.Shipping
        }, cancellationToken);
        basket.DateUpdated = DateTime.UtcNow;

        result.ResultObject = basket;
        return result;
    }

    /// <inheritdoc />
    public async Task<Basket> RefreshAutomaticDiscountsAsync(
        Basket basket,
        string? countryCode = null,
        CancellationToken cancellationToken = default)
    {
        var refreshResult = await RefreshPromotionalDiscountsAsync(basket, countryCode, cancellationToken);
        return refreshResult.ResultObject ?? basket;
    }

    /// <inheritdoc />
    public async Task<CrudResult<Basket>> RemovePromotionalDiscountAsync(
        Basket basket,
        Guid discountId,
        string? countryCode = null,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Basket>();

        // Find the discount line item with matching discount ID
        var discountLineItem = basket.LineItems
            .FirstOrDefault(li => li.LineItemType == LineItemType.Discount &&
                                  li.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountId, out var id) &&
                                  Guid.TryParse(id.UnwrapJsonElement()?.ToString(), out var parsedId) &&
                                  parsedId == discountId);

        if (discountLineItem == null)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = "Discount not found in basket.",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        basket.LineItems.Remove(discountLineItem);

        await checkoutService.Value.CalculateBasketAsync(new CalculateBasketParameters
        {
            Basket = basket,
            CountryCode = countryCode,
            ShippingAmountOverride = basket.Shipping
        }, cancellationToken);

        // Recompute the full promotional discount set after removing a code.
        var refreshResult = await RefreshPromotionalDiscountsAsync(basket, countryCode, cancellationToken);
        basket = refreshResult.ResultObject ?? basket;
        result.Messages.AddRange(refreshResult.Messages);
        basket.DateUpdated = DateTime.UtcNow;

        result.ResultObject = basket;
        return result;
    }

    /// <summary>
    /// Builds a discount context from the basket for discount engine calculations.
    /// </summary>
    private async Task<DiscountContext> BuildDiscountContextAsync(
        Basket basket,
        CancellationToken cancellationToken)
    {
        var selectedShippingOptionIds = new HashSet<Guid>();
        var selectedWarehouseByLineItemId = new Dictionary<Guid, Guid>();
        var supplierByWarehouseId = new Dictionary<Guid, Guid?>();
        var hasSelectedShippingContext = false;

        if (checkoutSessionService != null)
        {
            var session = await checkoutSessionService.GetSessionAsync(basket.Id, cancellationToken);
            hasSelectedShippingContext = session.SelectedShippingOptions.Count > 0;

            foreach (var selection in session.SelectedShippingOptions.Values)
            {
                if (SelectionKeyExtensions.TryParse(selection, out var shippingOptionId, out _, out _) &&
                    shippingOptionId.HasValue)
                {
                    selectedShippingOptionIds.Add(shippingOptionId.Value);
                }
            }

            if (hasSelectedShippingContext && !string.IsNullOrWhiteSpace(session.ShippingAddress.CountryCode))
            {
                var groupingResult = await checkoutService.Value.GetOrderGroupsAsync(new GetOrderGroupsParameters
                {
                    Basket = basket,
                    Session = session
                }, cancellationToken);

                if (groupingResult.Success)
                {
                    var selectedGroupKeys = session.SelectedShippingOptions.Keys.ToHashSet();

                    foreach (var group in groupingResult.Groups.Where(g => g.WarehouseId.HasValue))
                    {
                        if (!selectedGroupKeys.Contains(group.GroupId) &&
                            (!group.WarehouseId.HasValue || !selectedGroupKeys.Contains(group.WarehouseId.Value)))
                        {
                            continue;
                        }

                        foreach (var groupLineItem in group.LineItems)
                        {
                            selectedWarehouseByLineItemId.TryAdd(groupLineItem.LineItemId, group.WarehouseId!.Value);
                        }
                    }
                }
            }
        }

        if (warehouseService != null && selectedWarehouseByLineItemId.Count > 0)
        {
            foreach (var warehouseId in selectedWarehouseByLineItemId.Values.Distinct())
            {
                var warehouse = await warehouseService.GetWarehouseByIdAsync(warehouseId, cancellationToken);
                supplierByWarehouseId[warehouseId] = warehouse?.SupplierId;
            }
        }

        var selectedShippingOptionsList = selectedShippingOptionIds.ToList();
        var context = new DiscountContext
        {
            CustomerId = basket.CustomerId,
            SubTotal = basket.SubTotal,
            ShippingTotal = basket.Shipping,
            CurrencyCode = _settings.StoreCurrencyCode,
            ShippingAddress = basket.ShippingAddress,
            SelectedShippingOptionId = selectedShippingOptionsList.Count > 0
                ? selectedShippingOptionsList[0]
                : null,
            SelectedShippingOptionIds = selectedShippingOptionsList,
            AppliedDiscountIds = basket.LineItems
                .Where(li => li.LineItemType == LineItemType.Discount)
                .Select(li => li.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountId, out var id)
                    ? ParseGuid(id)
                    : null)
                .Where(id => id.HasValue)
                .Select(id => id!.Value)
                .ToList()
        };

        // Build lookups of product line items for add-on parent linking.
        // ParentLineItemId is authoritative; SKU is fallback for legacy rows.
        var productLineItems = basket.LineItems
            .Where(li => li.LineItemType == LineItemType.Product && !string.IsNullOrEmpty(li.Sku))
            .ToList();

        var productLineItemsById = productLineItems
            .ToDictionary(li => li.Id, li => li);

        var productLineItemsBySku = productLineItems
            .GroupBy(li => li.Sku!, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(group => group.Key, group => group.First(), StringComparer.OrdinalIgnoreCase);

        // Convert basket line items to discount context line items (products and add-ons)
        foreach (var lineItem in basket.LineItems.Where(li =>
            li.LineItemType == LineItemType.Product || li.LineItemType == LineItemType.Addon))
        {
            var isAddon = lineItem.LineItemType == LineItemType.Addon;
            LineItem? parentLineItem = null;

            // For add-ons, resolve parent by line item ID first, then SKU fallback for legacy rows.
            if (isAddon)
            {
                var parentLineItemId = lineItem.GetParentLineItemId();
                if (parentLineItemId.HasValue)
                {
                    productLineItemsById.TryGetValue(parentLineItemId.Value, out parentLineItem);
                }

                if (parentLineItem == null && !string.IsNullOrEmpty(lineItem.DependantLineItemSku))
                {
                    productLineItemsBySku.TryGetValue(lineItem.DependantLineItemSku, out parentLineItem);
                }
            }

            // Read product metadata from ExtendedData (for products) or parent (for add-ons).
            var metadataSource = isAddon && parentLineItem != null ? parentLineItem : lineItem;

            var resolvedWarehouseId = metadataSource.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.WarehouseId, out var warehouseIdObj)
                ? ParseGuid(warehouseIdObj)
                : null;
            var resolvedSupplierId = metadataSource.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.SupplierId, out var supplierIdObj)
                ? ParseGuid(supplierIdObj)
                : null;

            if (hasSelectedShippingContext)
            {
                var mappedWarehouseId = selectedWarehouseByLineItemId.TryGetValue(lineItem.Id, out var directWarehouseId)
                    ? directWarehouseId
                    : parentLineItem != null && selectedWarehouseByLineItemId.TryGetValue(parentLineItem.Id, out var parentWarehouseId)
                        ? parentWarehouseId
                        : (Guid?)null;

                if (mappedWarehouseId.HasValue)
                {
                    resolvedWarehouseId = mappedWarehouseId.Value;
                    resolvedSupplierId = supplierByWarehouseId.GetValueOrDefault(mappedWarehouseId.Value);
                }
                else
                {
                    // Selected shipping context is strict; do not infer supplier/warehouse for unassigned items.
                    resolvedWarehouseId = null;
                    resolvedSupplierId = null;
                }
            }

            var ctxLineItem = new DiscountContextLineItem
            {
                LineItemId = lineItem.Id,
                ProductId = lineItem.ProductId ?? parentLineItem?.ProductId ?? Guid.Empty,
                ProductRootId = metadataSource.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.ProductRootId, out var rootIdObj)
                    ? ParseGuid(rootIdObj) ?? Guid.Empty
                    : Guid.Empty,
                ProductTypeId = metadataSource.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.ProductTypeId, out var typeIdObj)
                    ? ParseGuid(typeIdObj)
                    : null,
                SupplierId = resolvedSupplierId,
                WarehouseId = resolvedWarehouseId,
                CollectionIds = metadataSource.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.CollectionIds, out var collectionIdsObj)
                    ? ParseGuidList(collectionIdsObj)
                    : [],
                ProductFilterIds = metadataSource.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.FilterIds, out var filterIdsObj)
                    ? ParseGuidList(filterIdsObj)
                    : [],
                Sku = lineItem.Sku ?? string.Empty,
                Quantity = lineItem.Quantity,
                UnitPrice = lineItem.Amount,
                LineTotal = lineItem.Quantity * lineItem.Amount,
                IsTaxable = lineItem.IsTaxable,
                TaxRate = lineItem.TaxRate,
                IsAddon = isAddon,
                ParentLineItemId = parentLineItem?.Id
            };

            context.LineItems.Add(ctxLineItem);
        }

        return context;
    }

    private List<string> AddCalculatedDiscountLineItems(
        Basket basket,
        Discount discount,
        DiscountCalculationResult calculationResult,
        bool isAutomatic,
        string? discountCode)
    {
        var lineItemsById = basket.LineItems
            .Where(li => li.LineItemType is LineItemType.Product or LineItemType.Custom or LineItemType.Addon)
            .ToDictionary(li => li.Id, li => li);

        var lineItemDiscountType = discount.Category is DiscountCategory.BuyXGetY or DiscountCategory.FreeShipping
            ? DiscountValueType.FixedAmount
            : discount.ValueType;

        var metadata = new Dictionary<string, string>
        {
            [Constants.ExtendedDataKeys.DiscountId] = discount.Id.ToString(),
            [Constants.ExtendedDataKeys.DiscountName] = discount.Name,
            [Constants.ExtendedDataKeys.DiscountCategory] = discount.Category.ToString(),
            [Constants.ExtendedDataKeys.ApplyAfterTax] = discount.ApplyAfterTax.ToString(),
            [Constants.ExtendedDataKeys.DiscountValueType] = discount.ValueType.ToString(),
            [Constants.ExtendedDataKeys.DiscountValue] = discount.Value.ToString(CultureInfo.InvariantCulture)
        };

        if (!string.IsNullOrWhiteSpace(discountCode))
        {
            metadata[Constants.ExtendedDataKeys.DiscountCode] = discountCode;
        }

        var allErrors = new List<string>();
        var appliedLinkedDiscount = false;
        var hasItemAllocations = calculationResult.DiscountedLineItems.Count > 0 &&
                                 discount.Category is DiscountCategory.AmountOffProducts or DiscountCategory.BuyXGetY;

        if (hasItemAllocations)
        {
            foreach (var discountedLineItem in calculationResult.DiscountedLineItems.Where(x => x.TotalDiscount > 0))
            {
                if (!lineItemsById.TryGetValue(discountedLineItem.LineItemId, out var basketLineItem) ||
                    string.IsNullOrWhiteSpace(basketLineItem.Sku))
                {
                    continue;
                }

                var amount = GetLineItemAmountForDiscount(
                    lineItemDiscountType,
                    discount,
                    discountedLineItem.TotalDiscount);

                var errors = lineItemService.AddDiscountLineItem(new AddDiscountLineItemParameters
                {
                    LineItems = basket.LineItems,
                    Amount = amount,
                    DiscountValueType = lineItemDiscountType,
                    CurrencyCode = _settings.StoreCurrencyCode,
                    LinkedSku = basketLineItem.Sku,
                    Name = discount.Name,
                    Reason = isAutomatic ? "Automatic discount" : discountCode,
                    ExtendedData = metadata
                });

                if (errors.Count == 0)
                {
                    appliedLinkedDiscount = true;
                }

                allErrors.AddRange(errors);
            }
        }

        if (!hasItemAllocations || !appliedLinkedDiscount)
        {
            var amount = GetLineItemAmountForDiscount(
                lineItemDiscountType,
                discount,
                calculationResult.TotalDiscountAmount);

            var errors = lineItemService.AddDiscountLineItem(new AddDiscountLineItemParameters
            {
                LineItems = basket.LineItems,
                Amount = amount,
                DiscountValueType = lineItemDiscountType,
                CurrencyCode = _settings.StoreCurrencyCode,
                LinkedSku = null,
                Name = discount.Name,
                Reason = isAutomatic ? "Automatic discount" : discountCode,
                ExtendedData = metadata
            });

            allErrors.AddRange(errors);
        }

        return allErrors;
    }

    private static decimal GetLineItemAmountForDiscount(
        DiscountValueType lineItemDiscountType,
        Discount discount,
        decimal calculatedAmount)
    {
        return lineItemDiscountType switch
        {
            DiscountValueType.Percentage => discount.Value,
            DiscountValueType.Free => 100m,
            _ => calculatedAmount
        };
    }

    private static List<PersistedCodeDiscount> SnapshotPersistedCodeDiscounts(Basket basket)
    {
        return basket.LineItems
            .Where(li => li.LineItemType == LineItemType.Discount)
            .Select(li =>
            {
                if (!li.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountCode, out var codeObj) ||
                    !li.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountId, out var idObj))
                {
                    return null;
                }

                var code = codeObj.UnwrapJsonElement()?.ToString()?.Trim();
                var discountId = ParseGuid(idObj);
                if (string.IsNullOrWhiteSpace(code) || !discountId.HasValue)
                {
                    return null;
                }

                return new PersistedCodeDiscount(discountId.Value, code);
            })
            .Where(x => x != null)
            .Select(x => x!)
            .ToList();
    }

    private static Guid? ParseGuid(object? value)
    {
        return Guid.TryParse(value.UnwrapJsonElement()?.ToString(), out var parsedId)
            ? parsedId
            : null;
    }

    private static List<Guid> ParseGuidList(object? value)
    {
        var unwrapped = value.UnwrapJsonElement();
        if (unwrapped == null)
        {
            return [];
        }

        if (unwrapped is IEnumerable<Guid> enumerable)
        {
            return enumerable.Distinct().ToList();
        }

        var rawValue = unwrapped.ToString();
        if (string.IsNullOrWhiteSpace(rawValue))
        {
            return [];
        }

        try
        {
            if (rawValue.TrimStart().StartsWith("[", StringComparison.Ordinal))
            {
                return JsonSerializer.Deserialize<List<Guid>>(rawValue) ?? [];
            }
        }
        catch (JsonException)
        {
            // Fallback to simple token parsing below.
        }

        return rawValue
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(token => Guid.TryParse(token, out var id) ? id : (Guid?)null)
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .ToList();
    }

    private Task<(bool Allowed, string? ErrorMessage)> CheckDiscountCodeRateLimitAsync(Guid basketId)
    {
        var rateLimitKey = $"discount-code-attempts:{basketId}";

        var result = rateLimiter.TryAcquire(rateLimitKey, MAX_DISCOUNT_CODE_ATTEMPTS_PER_MINUTE, DiscountCodeRateLimitWindow);

        if (!result.IsAllowed)
        {
            var retryMessage = result.RetryAfter.HasValue
                ? $" Please wait {result.RetryAfter.Value.TotalSeconds:F0} seconds before trying again."
                : " Please wait a minute before trying again.";
            return Task.FromResult<(bool, string?)>((false, $"Too many discount code attempts.{retryMessage}"));
        }

        return Task.FromResult<(bool, string?)>((true, null));
    }
}
