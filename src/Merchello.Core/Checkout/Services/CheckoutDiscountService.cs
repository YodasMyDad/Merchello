using System.Text.Json;
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
using Microsoft.Extensions.Options;

namespace Merchello.Core.Checkout.Services;

public class CheckoutDiscountService(
    ILineItemService lineItemService,
    IMerchelloNotificationPublisher notificationPublisher,
    IOptions<MerchelloSettings> settings,
    IRateLimiter rateLimiter,
    Lazy<ICheckoutService> checkoutService,
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
            Guid.TryParse(discountIdObj.ToString(), out var discountId) &&
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
        var context = BuildDiscountContext(basket);

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

        // Add discount as a line item
        var currencyCode = _settings.StoreCurrencyCode;
        var errors = lineItemService.AddDiscountLineItem(new AddDiscountLineItemParameters
        {
            LineItems = basket.LineItems,
            Amount = calculationResult.TotalDiscountAmount,
            DiscountValueType = DiscountValueType.FixedAmount,
            CurrencyCode = currencyCode,
            LinkedSku = null,
            Name = discount.Name,
            Reason = discount.Code,
            ExtendedData = new Dictionary<string, string>
            {
                [Constants.ExtendedDataKeys.DiscountId] = discount.Id.ToString(),
                [Constants.ExtendedDataKeys.DiscountCode] = discount.Code ?? string.Empty,
                [Constants.ExtendedDataKeys.DiscountName] = discount.Name,
                [Constants.ExtendedDataKeys.DiscountCategory] = discount.Category.ToString(),
                [Constants.ExtendedDataKeys.ApplyAfterTax] = discount.ApplyAfterTax.ToString()
            }
        });

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

        // Refresh automatic discounts - the applied code may conflict with existing automatic discounts
        basket = await RefreshAutomaticDiscountsAsync(basket, countryCode, cancellationToken);
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

        var context = BuildDiscountContext(basket);
        return await discountEngine.GetApplicableAutomaticDiscountsAsync(context, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<Basket> RefreshAutomaticDiscountsAsync(
        Basket basket,
        string? countryCode = null,
        CancellationToken cancellationToken = default)
    {
        if (discountEngine == null)
        {
            return basket;
        }

        // Remove existing automatic discount line items
        var automaticDiscountLineItems = basket.LineItems
            .Where(li => li.LineItemType == LineItemType.Discount &&
                         li.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountCategory, out var category) &&
                         !li.ExtendedData.ContainsKey(Constants.ExtendedDataKeys.DiscountCode))
            .ToList();

        foreach (var lineItem in automaticDiscountLineItems)
        {
            basket.LineItems.Remove(lineItem);
        }

        // Get applicable automatic discounts
        var context = BuildDiscountContext(basket);
        var applicableDiscounts = await discountEngine.GetApplicableAutomaticDiscountsAsync(context, cancellationToken);

        // Get existing code-based discounts from basket to consider in combination filtering
        var existingCodeDiscountIds = basket.LineItems
            .Where(li => li.LineItemType == LineItemType.Discount &&
                         li.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountId, out _) &&
                         li.ExtendedData.ContainsKey(Constants.ExtendedDataKeys.DiscountCode))
            .Select(li => Guid.TryParse(li.ExtendedData[Constants.ExtendedDataKeys.DiscountId] as string, out var id) ? id : Guid.Empty)
            .Where(id => id != Guid.Empty)
            .ToList();

        List<Discount> existingCodeDiscounts = [];
        if (discountService != null)
        {
            foreach (var discountId in existingCodeDiscountIds)
            {
                var discount = await discountService.GetByIdAsync(discountId, cancellationToken);
                if (discount != null)
                {
                    existingCodeDiscounts.Add(discount);
                }
            }
        }

        // Filter automatic discounts based on combination rules with both:
        // - Each other (automatic discounts)
        // - Existing code-based discounts in basket
        var allDiscountsToConsider = existingCodeDiscounts
            .Concat(applicableDiscounts.Select(ad => ad.Discount))
            .ToList();

        var filteredDiscounts = discountEngine.FilterCombinableDiscounts(allDiscountsToConsider);

        // Only apply automatic discounts that made it through the filter
        var discountsToApply = applicableDiscounts
            .Where(ad => filteredDiscounts.Contains(ad.Discount))
            .ToList();

        // Apply each automatic discount that passed combination filtering
        var currencyCode = _settings.StoreCurrencyCode;
        foreach (var applicableDiscount in discountsToApply)
        {
            var discount = applicableDiscount.Discount;

            lineItemService.AddDiscountLineItem(new AddDiscountLineItemParameters
            {
                LineItems = basket.LineItems,
                Amount = applicableDiscount.CalculatedAmount,
                DiscountValueType = DiscountValueType.FixedAmount,
                CurrencyCode = currencyCode,
                LinkedSku = null,
                Name = discount.Name,
                Reason = "Automatic discount",
                ExtendedData = new Dictionary<string, string>
                {
                    [Constants.ExtendedDataKeys.DiscountId] = discount.Id.ToString(),
                    [Constants.ExtendedDataKeys.DiscountName] = discount.Name,
                    [Constants.ExtendedDataKeys.DiscountCategory] = discount.Category.ToString(),
                    [Constants.ExtendedDataKeys.ApplyAfterTax] = discount.ApplyAfterTax.ToString()
                }
            });
        }

        await checkoutService.Value.CalculateBasketAsync(new CalculateBasketParameters
        {
            Basket = basket,
            CountryCode = countryCode,
            ShippingAmountOverride = basket.Shipping  // Preserve existing shipping amount
        }, cancellationToken);
        basket.DateUpdated = DateTime.UtcNow;

        return basket;
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
                                  Guid.TryParse(id?.ToString(), out var parsedId) &&
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

        await checkoutService.Value.CalculateBasketAsync(new CalculateBasketParameters { Basket = basket, CountryCode = countryCode }, cancellationToken);

        // Refresh automatic discounts - a removed code may have been blocking automatic discounts
        basket = await RefreshAutomaticDiscountsAsync(basket, countryCode, cancellationToken);
        basket.DateUpdated = DateTime.UtcNow;

        result.ResultObject = basket;
        return result;
    }

    /// <summary>
    /// Builds a discount context from the basket for discount engine calculations.
    /// </summary>
    private DiscountContext BuildDiscountContext(Basket basket)
    {
        var context = new DiscountContext
        {
            CustomerId = basket.CustomerId,
            SubTotal = basket.SubTotal,
            ShippingTotal = basket.Shipping,
            CurrencyCode = _settings.StoreCurrencyCode,
            ShippingAddress = basket.ShippingAddress,
            AppliedDiscountIds = basket.LineItems
                .Where(li => li.LineItemType == LineItemType.Discount)
                .Select(li => li.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountId, out var id) &&
                              Guid.TryParse(id.UnwrapJsonElement()?.ToString(), out var parsedId)
                    ? parsedId
                    : Guid.Empty)
                .Where(id => id != Guid.Empty)
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

            var ctxLineItem = new DiscountContextLineItem
            {
                LineItemId = lineItem.Id,
                ProductId = lineItem.ProductId ?? parentLineItem?.ProductId ?? Guid.Empty,
                Sku = lineItem.Sku ?? string.Empty,
                Quantity = lineItem.Quantity,
                UnitPrice = lineItem.Amount,
                LineTotal = lineItem.Quantity * lineItem.Amount,
                IsAddon = isAddon,
                ParentLineItemId = parentLineItem?.Id
            };

            // Read product metadata from ExtendedData (for products) or parent (for add-ons)
            var metadataSource = isAddon && parentLineItem != null ? parentLineItem : lineItem;

            if (metadataSource.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.ProductRootId, out var rootIdObj) &&
                rootIdObj is string rootIdStr &&
                Guid.TryParse(rootIdStr, out var productRootId))
            {
                ctxLineItem.ProductRootId = productRootId;
            }

            if (metadataSource.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.ProductTypeId, out var typeIdObj) &&
                typeIdObj is string typeIdStr &&
                Guid.TryParse(typeIdStr, out var productTypeId))
            {
                ctxLineItem.ProductTypeId = productTypeId;
            }

            if (metadataSource.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.CollectionIds, out var collectionIdsObj) &&
                collectionIdsObj is string collectionIdsJson)
            {
                try
                {
                    ctxLineItem.CollectionIds = JsonSerializer.Deserialize<List<Guid>>(collectionIdsJson) ?? [];
                }
                catch (JsonException)
                {
                    // Invalid JSON format - continue with empty collection IDs
                }
            }

            context.LineItems.Add(ctxLineItem);
        }

        return context;
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
