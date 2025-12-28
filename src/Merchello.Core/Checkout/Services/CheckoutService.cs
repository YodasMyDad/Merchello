using System.Text.Json;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Checkout.Factories;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Strategies;
using Merchello.Core.Checkout.Strategies.Models;
using Merchello.Core.Data;
using Merchello.Core.Discounts.Models;
using Merchello.Core.Discounts.Services;
using Merchello.Core.Discounts.Services.Interfaces;
using Merchello.Core.Notifications;
using Merchello.Core.Notifications.BasketNotifications;
using Merchello.Core.Notifications.CheckoutNotifications;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Warehouses.Services.Interfaces;
using Merchello.Core.Warehouses.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Checkout.Services;

public class CheckoutService(
    ILineItemService lineItemService,
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IHttpContextAccessor httpContextAccessor,
    IShippingQuoteService shippingQuoteService,
    BasketFactory basketFactory,
    LineItemFactory lineItemFactory,
    IMerchelloNotificationPublisher notificationPublisher,
    IOptions<MerchelloSettings> settings,
    IOrderGroupingStrategyResolver orderGroupingStrategyResolver,
    IProductService productService,
    IWarehouseService warehouseService,
    IInvoiceService invoiceService,
    IDiscountEngine? discountEngine = null,
    IDiscountService? discountService = null,
    ILocationsService? locationsService = null) : ICheckoutService
{
    private readonly ILocationsService _locationsService = locationsService ?? new NoopLocationsService();
    private readonly MerchelloSettings _settings = settings.Value;

    /// <summary>
    /// Add line item to the basket
    /// </summary>
    /// <param name="basket"></param>
    /// <param name="newLineItem"></param>
    /// <param name="countryCode"></param>
    /// <param name="cancellationToken"></param>
    public async Task AddToBasketAsync(Basket basket, LineItem newLineItem, string countryCode, CancellationToken cancellationToken = default)
    {
        basket.Errors = lineItemService.AddLineItem(basket.LineItems, newLineItem)
            .Select(x => new BasketError { Message = x, RelatedLineItemId = newLineItem.Id}).ToList();
        if (basket.Errors.Any())
        {
            return;
        }

        await CalculateBasketAsync(basket, countryCode, cancellationToken: cancellationToken);
        basket.DateUpdated = DateTime.UtcNow;
    }

    /// <summary>
    /// Add a discount to the basket as a discount line item.
    /// </summary>
    /// <param name="basket">The basket to add the discount to</param>
    /// <param name="amount">The discount amount (positive value)</param>
    /// <param name="discountValueType">Whether this is a fixed amount, percentage, or free discount</param>
    /// <param name="linkedSku">Optional SKU to link the discount to a specific product</param>
    /// <param name="name">Optional name for the discount</param>
    /// <param name="reason">Optional reason/description for the discount</param>
    /// <param name="countryCode">Country code for shipping calculation</param>
    /// <param name="cancellationToken">Cancellation token</param>
    public async Task AddDiscountToBasketAsync(
        Basket basket,
        decimal amount,
        DiscountValueType discountValueType,
        string? linkedSku = null,
        string? name = null,
        string? reason = null,
        string? countryCode = null,
        CancellationToken cancellationToken = default)
    {
        var currencyCode = basket.Currency ?? _settings.StoreCurrencyCode;
        var errors = lineItemService.AddDiscountLineItem(
            basket.LineItems,
            amount,
            discountValueType,
            currencyCode,
            linkedSku,
            name,
            reason);

        basket.Errors = errors.Select(x => new BasketError { Message = x }).ToList();
        if (basket.Errors.Count > 0)
        {
            return;
        }

        await CalculateBasketAsync(basket, countryCode, cancellationToken: cancellationToken);
        basket.DateUpdated = DateTime.UtcNow;
    }

    /// <summary>
    /// Remove a discount line item from the basket
    /// </summary>
    /// <param name="basket">The basket</param>
    /// <param name="discountLineItemId">The ID of the discount line item to remove</param>
    /// <param name="countryCode">Country code for recalculation</param>
    /// <param name="cancellationToken">Cancellation token</param>
    public async Task RemoveDiscountFromBasketAsync(
        Basket basket,
        Guid discountLineItemId,
        string? countryCode = null,
        CancellationToken cancellationToken = default)
    {
        var removed = lineItemService.RemoveDiscountLineItem(basket.LineItems, discountLineItemId);
        if (!removed)
        {
            basket.Errors.Add(new BasketError
            {
                Message = "Discount line item not found",
                RelatedLineItemId = discountLineItemId
            });
            return;
        }

        await CalculateBasketAsync(basket, countryCode, cancellationToken: cancellationToken);
        basket.DateUpdated = DateTime.UtcNow;
    }

    /// <summary>
    /// Remove item from basket
    /// </summary>
    /// <param name="basket"></param>
    /// <param name="lineItemId"></param>
    /// <param name="countryCode"></param>
    /// <param name="cancellationToken"></param>
    public async Task RemoveFromBasketAsync(Basket basket, Guid lineItemId, string? countryCode, CancellationToken cancellationToken = default)
    {
        var itemToRemove = basket.LineItems.FirstOrDefault(item => item.Id == lineItemId);
        if (itemToRemove != null)
        {
            basket.LineItems.Remove(itemToRemove);
            await CalculateBasketAsync(basket, countryCode, cancellationToken: cancellationToken);
            basket.DateUpdated = DateTime.UtcNow;
        }
        else
        {
            basket.Errors.Add(new ()
            {
                Message = "Unable to find line item to remove",
                RelatedLineItemId = lineItemId
            });
        }
    }

    /// <summary>
    /// Calculate the basket if there are any changes
    /// </summary>
    /// <param name="basket"></param>
    /// <param name="countryCode"></param>
    /// <param name="defaultTaxRate"></param>
    /// <param name="isShippingTaxable"></param>
    /// <param name="cancellationToken"></param>
    public async Task CalculateBasketAsync(Basket basket, string? countryCode = null, decimal defaultTaxRate = 20, bool isShippingTaxable = true, CancellationToken cancellationToken = default)
    {
        // Resolve country code from settings if not provided
        var resolvedCountryCode = countryCode ?? _settings.AllowedCountries?.FirstOrDefault() ?? "US";

        basket.Errors = basket.Errors.Where(error => !error.IsShippingError).ToList();

        var shippingQuotes = (await shippingQuoteService
            .GetQuotesAsync(basket, resolvedCountryCode, null, cancellationToken))
            .ToList();

        basket.AvailableShippingQuotes = shippingQuotes;

        foreach (var quoteError in shippingQuotes.SelectMany(q => q.Errors))
        {
            basket.Errors.Add(new BasketError
            {
                Message = quoteError,
                IsShippingError = true
            });
        }

        var shippingCost = shippingQuotes
            .SelectMany(q => q.ServiceLevels)
            .OrderBy(level => level.TotalCost)
            .Select(level => level.TotalCost)
            .FirstOrDefault();

        var currencyCode = basket.Currency ?? _settings.StoreCurrencyCode;

        // Use the unified calculation method that handles discount line items
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            lineItemService.CalculateFromLineItems(basket.LineItems, shippingCost, defaultTaxRate, currencyCode, isShippingTaxable);

        basket.SubTotal = subTotal;
        basket.Discount = discount;
        basket.AdjustedSubTotal = adjustedSubTotal;
        basket.Tax = tax;
        basket.Total = total;
        basket.Shipping = shipping;
    }

    /// <summary>
    /// Get basket for a customer or anonymous user
    /// </summary>
    /// <param name="parameters"></param>
    /// <param name="cancellationToken"></param>
    /// <returns></returns>
    public async Task<Basket?> GetBasket(GetBasketParameters parameters, CancellationToken cancellationToken = default)
    {
        Basket? basket;
        var httpContext = httpContextAccessor.HttpContext;

        // Check in the session first
        var basketInSession = httpContext?.Session.GetString("Basket");
        if (!string.IsNullOrEmpty(basketInSession))
        {
            basket = JsonSerializer.Deserialize<Basket>(basketInSession);
            if (basket != null) return basket;
        }

        Basket? anonBasket = null;
        Basket? userBasket = null;

        using var scope = efCoreScopeProvider.CreateScope();
        basket = await scope.ExecuteWithContextAsync(async db =>
        {
            if (parameters.CustomerId.HasValue)
            {
                // User is logged in
                // ReSharper disable once EntityFramework.NPlusOne.IncompleteDataQuery
                userBasket = await db.Baskets
                    .FirstOrDefaultAsync(b => b.CustomerId == parameters.CustomerId, cancellationToken);
            }

            // User is not logged in or has items added before logging in, retrieve using cookie
            var basketId = httpContext?.Request.Cookies[Constants.Cookies.BasketId];
            if (!string.IsNullOrEmpty(basketId) && Guid.TryParse(basketId, out var parsedBasketId))
            {
                // ReSharper disable once EntityFramework.NPlusOne.IncompleteDataQuery
                anonBasket = await db.Baskets
                    .FirstOrDefaultAsync(b => b.Id == parsedBasketId, cancellationToken);
            }

            if (parameters.CustomerId.HasValue && anonBasket != null)
            {
                // Merge baskets
                if (userBasket == null)
                {
                    // No existing user basket, so assign the anonymous basket to the user
                    anonBasket.CustomerId = parameters.CustomerId;
                }
                else
                {
                    // Merge line items from anonBasket to userBasket
                    // ReSharper disable once EntityFramework.NPlusOne.IncompleteDataUsage
                    foreach (var anonItem in anonBasket.LineItems)
                    {
                        // ReSharper disable once EntityFramework.NPlusOne.IncompleteDataUsage
                        var existingItem = userBasket.LineItems
                            .FirstOrDefault(li => li.ProductId == anonItem.ProductId);

                        if (existingItem != null)
                        {
                            // Item exists in both baskets, so update the quantity in the user's basket
                            existingItem.Quantity += anonItem.Quantity;
                        }
                        else
                        {
                            // Item only exists in anonBasket, so add to user's basket
                            userBasket.LineItems.Add(anonItem);
                        }
                    }

                    // Remove the anonymous basket from the database
                    db.Baskets.Remove(anonBasket);
                }

                await db.SaveChangesAsync(cancellationToken);
            }

            return userBasket ?? anonBasket;
        });

        scope.Complete();

        // If we retrieved a basket, cache it in the session for subsequent requests
        if (basket != null)
        {
            httpContext?.Session.SetString("Basket", JsonSerializer.Serialize(basket));
        }

        return basket;
    }

    /// <summary>
    /// Add item to basket with automatic basket retrieval/creation
    /// </summary>
    /// <param name="parameters"></param>
    /// <param name="cancellationToken"></param>
    /// <returns></returns>
    public async Task AddToBasket(AddToBasketParameters parameters, CancellationToken cancellationToken = default)
    {
        if (parameters.ItemToAdd != null)
        {
            // 1. Retrieve the basket using the GetBasket method
            var basket = await GetBasket(new GetBasketParameters { CustomerId = parameters.CustomerId }, cancellationToken);

            var isNewBasket = false;

            using var scope = efCoreScopeProvider.CreateScope();
            await scope.ExecuteWithContextAsync<Task>(async db =>
            {
                if (basket == null)
                {
                    isNewBasket = true;
                    basket = basketFactory.Create(
                        parameters.CustomerId,
                        _settings.StoreCurrencyCode,
                        _settings.CurrencySymbol);
                    db.Baskets.Add(basket);
                }
                else
                {
                    // Attach existing basket for update tracking
                    db.Baskets.Update(basket);
                }

                // 2. Use CheckoutService to add the new item to the basket
                var fallbackCountryCode = _settings.AllowedCountries?.FirstOrDefault() ?? "GB";
                var countryCode = !string.IsNullOrWhiteSpace(basket.ShippingAddress.CountryCode)
                    ? basket.ShippingAddress.CountryCode
                    : fallbackCountryCode;
                await AddToBasketAsync(basket, parameters.ItemToAdd, countryCode, cancellationToken);

                // 3. Save the changes to the database
                await db.SaveChangesAsync(cancellationToken);
            });

            scope.Complete();

            // 4. If it's a new basket and for a guest user, update the cookie
            if (isNewBasket && !parameters.CustomerId.HasValue && basket != null)
            {
                httpContextAccessor.HttpContext?.Response.Cookies.Append(
                    Constants.Cookies.BasketId,
                    basket.Id.ToString(),
                    new CookieOptions
                    {
                        Expires = DateTimeOffset.UtcNow.AddDays(30),
                        HttpOnly = true,
                        Secure = true,
                        SameSite = SameSiteMode.Lax
                    });
            }

            // 5. Update the basket stored in the session for immediate reflection on the UI
            if (basket != null)
            {
                httpContextAccessor.HttpContext?.Session.SetString("Basket", JsonSerializer.Serialize(basket));
            }
        }
    }

    /// <summary>
    /// Update line item quantity in basket
    /// </summary>
    public async Task UpdateLineItemQuantity(Guid lineItemId, int quantity, string? countryCode = null, CancellationToken cancellationToken = default)
    {
        var basket = await GetBasket(new GetBasketParameters(), cancellationToken);

        if (basket != null)
        {
            var lineItem = basket.LineItems.FirstOrDefault(li => li.Id == lineItemId);
            if (lineItem != null)
            {
                lineItem.Quantity = quantity;
                basket.DateUpdated = DateTime.UtcNow;
                await CalculateBasketAsync(basket, countryCode, cancellationToken: cancellationToken);

                using var scope = efCoreScopeProvider.CreateScope();
                await scope.ExecuteWithContextAsync<Task>(async db =>
                {
                    db.Baskets.Update(basket);
                    await db.SaveChangesAsync(cancellationToken);
                });
                scope.Complete();

                // Update session with modified basket
                httpContextAccessor.HttpContext?.Session.SetString("Basket", JsonSerializer.Serialize(basket));
            }
        }
    }

    /// <summary>
    /// Remove line item from basket
    /// </summary>
    public async Task RemoveLineItem(Guid lineItemId, string? countryCode = null, CancellationToken cancellationToken = default)
    {
        var basket = await GetBasket(new GetBasketParameters(), cancellationToken);

        if (basket != null)
        {
            await RemoveFromBasketAsync(basket, lineItemId, countryCode, cancellationToken);
            basket.DateUpdated = DateTime.UtcNow;

            using var scope = efCoreScopeProvider.CreateScope();
            await scope.ExecuteWithContextAsync<Task>(async db =>
            {
                db.Baskets.Update(basket);
                await db.SaveChangesAsync(cancellationToken);
            });
            scope.Complete();

            // Update session with modified basket
            httpContextAccessor.HttpContext?.Session.SetString("Basket", JsonSerializer.Serialize(basket));
        }
    }

    /// <summary>
    /// Delete basket (used after order completion)
    /// </summary>
    public async Task DeleteBasket(Guid basketId, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var basketToDelete = await db.Baskets
                .FirstOrDefaultAsync(b => b.Id == basketId, cancellationToken);

            if (basketToDelete != null)
            {
                db.Baskets.Remove(basketToDelete);
                await db.SaveChangesAsync(cancellationToken);
            }
        });
        scope.Complete();
    }

    // Convenience facade methods for locations
    public Task<IReadOnlyCollection<CountryAvailability>> GetAvailableCountriesAsync(CancellationToken cancellationToken = default)
        => _locationsService.GetAvailableCountriesAsync(cancellationToken);

    public async Task<IReadOnlyCollection<RegionAvailability>> GetAvailableRegionsAsync(string countryCode, CancellationToken cancellationToken = default)
    {
        // Start from globally available regions (warehouse service regions + catalog)
        var regions = await _locationsService.GetAvailableRegionsAsync(countryCode, cancellationToken);

        // If no basket or no product items, return the base regions
        var basket = await GetBasket(new GetBasketParameters(), cancellationToken);
        if (basket == null || !basket.LineItems.Any(li => li.ProductId.HasValue))
        {
            return regions;
        }

        // Load products with shipping info for current basket
        var productIds = basket.LineItems
            .Where(li => li.ProductId.HasValue)
            .Select(li => li.ProductId!.Value)
            .Distinct()
            .ToList();

        using var scope = efCoreScopeProvider.CreateScope();
        var products = await scope.ExecuteWithContextAsync(async db =>
        {
            // Reuse the same includes used by ShippingQuoteService to ensure consistency
            return await db.Products
                .Include(product => product.ProductRoot)
                    .ThenInclude(pr => pr!.ProductRootWarehouses)
                        .ThenInclude(prw => prw.Warehouse)
                            .ThenInclude(w => w!.ShippingOptions)
                                .ThenInclude(so => so.ShippingCosts)
                .Include(product => product.ProductRoot)
                    .ThenInclude(pr => pr!.ProductRootWarehouses)
                        .ThenInclude(prw => prw.Warehouse)
                            .ThenInclude(w => w!.ServiceRegions)
                .Include(product => product.ShippingOptions)
                    .ThenInclude(option => option.ShippingCosts)
                .Include(product => product.ShippingOptions)
                    .ThenInclude(option => option.Warehouse)
                        .ThenInclude(w => w!.ServiceRegions)
                .AsNoTracking()
                .Where(product => productIds.Contains(product.Id))
                .ToDictionaryAsync(p => p.Id, cancellationToken);
        });
        scope.Complete();

        // If any basket product is missing, fall back to base regions
        if (products.Count == 0)
        {
            return regions;
        }

        // Filter regions so that all basket items have at least one valid shipping option to that region
        // Uses ProductExtensions.GetValidShippingOptionsForCountry to match provider logic
        var filtered = regions
            .Where(r =>
            {
                foreach (var li in basket.LineItems.Where(x => x.ProductId.HasValue))
                {
                    if (!products.TryGetValue(li.ProductId!.Value, out var product))
                    {
                        return false;
                    }

                    var hasValid = Merchello.Core.Products.Extensions.ProductExtensions
                        .GetShippingAmountForCountry(product, countryCode, r.RegionCode)
                        .HasValue;

                    if (!hasValid)
                    {
                        return false;
                    }
                }
                return true;
            })
            .ToList();

        return filtered;
    }

    /// <summary>
    /// Creates a new basket with the specified currency
    /// </summary>
    public Basket CreateBasket(string? currency = null, string? currencySymbol = null, Guid? customerId = null)
    {
        return basketFactory.Create(
            customerId,
            currency ?? _settings.StoreCurrencyCode,
            currencySymbol ?? _settings.CurrencySymbol);
    }

    /// <summary>
    /// Creates a line item for a product with metadata for discount matching
    /// </summary>
    public LineItem CreateLineItem(Products.Models.Product product, int quantity = 1)
    {
        var lineItem = lineItemFactory.CreateFromProduct(product, quantity);

        // Add product metadata for discount matching (used by discount engine for targeting)
        lineItem.ExtendedData[Constants.ExtendedDataKeys.ProductRootId] = product.ProductRootId.ToString();

        // ProductRoot must be loaded for ProductTypeId and Categories
        var productRoot = product.ProductRoot;
        if (productRoot != null)
        {
            lineItem.ExtendedData[Constants.ExtendedDataKeys.ProductTypeId] = productRoot.ProductTypeId.ToString();

            // Add collection IDs if collections are loaded
            if (productRoot.Collections.Count > 0)
            {
                var collectionIds = productRoot.Collections.Select(c => c.Id).ToList();
                lineItem.ExtendedData[Constants.ExtendedDataKeys.CollectionIds] = JsonSerializer.Serialize(collectionIds);
            }
        }

        return lineItem;
    }

    /// <summary>
    /// Applies a discount code to the basket.
    /// </summary>
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
                ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
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
                ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
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
                ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
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
                ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
            });
            return result;
        }

        // Add discount as a line item
        var currencyCode = basket.Currency ?? _settings.StoreCurrencyCode;
        var errors = lineItemService.AddDiscountLineItem(
            basket.LineItems,
            calculationResult.TotalDiscountAmount,
            DiscountValueType.FixedAmount,
            currencyCode,
            linkedSku: null,
            name: discount.Name,
            reason: discount.Code,
            extendedData: new Dictionary<string, string>
            {
                [Constants.ExtendedDataKeys.DiscountId] = discount.Id.ToString(),
                [Constants.ExtendedDataKeys.DiscountCode] = discount.Code ?? string.Empty,
                [Constants.ExtendedDataKeys.DiscountName] = discount.Name,
                [Constants.ExtendedDataKeys.DiscountCategory] = discount.Category.ToString(),
                [Constants.ExtendedDataKeys.ApplyAfterTax] = discount.ApplyAfterTax.ToString()
            });

        if (errors.Count > 0)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = errors.First(),
                ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
            });
            return result;
        }

        await CalculateBasketAsync(basket, countryCode, cancellationToken: cancellationToken);
        basket.DateUpdated = DateTime.UtcNow;

        // Publish "After" notification
        await notificationPublisher.PublishAsync(new DiscountCodeAppliedNotification(basket, discount), cancellationToken);

        result.ResultObject = basket;
        return result;
    }

    /// <summary>
    /// Gets all applicable automatic discounts for the basket.
    /// </summary>
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

    /// <summary>
    /// Refreshes automatic discounts on the basket.
    /// </summary>
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

        var existingCodeDiscounts = new List<Discount>();
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
        var currencyCode = basket.Currency ?? _settings.StoreCurrencyCode;
        foreach (var applicableDiscount in discountsToApply)
        {
            var discount = applicableDiscount.Discount;

            lineItemService.AddDiscountLineItem(
                basket.LineItems,
                applicableDiscount.CalculatedAmount,
                DiscountValueType.FixedAmount,
                currencyCode,
                linkedSku: null,
                name: discount.Name,
                reason: "Automatic discount",
                extendedData: new Dictionary<string, string>
                {
                    [Constants.ExtendedDataKeys.DiscountId] = discount.Id.ToString(),
                    [Constants.ExtendedDataKeys.DiscountName] = discount.Name,
                    [Constants.ExtendedDataKeys.DiscountCategory] = discount.Category.ToString(),
                    [Constants.ExtendedDataKeys.ApplyAfterTax] = discount.ApplyAfterTax.ToString()
                });
        }

        await CalculateBasketAsync(basket, countryCode, cancellationToken: cancellationToken);
        basket.DateUpdated = DateTime.UtcNow;

        return basket;
    }

    /// <summary>
    /// Removes a promotional discount from the basket.
    /// </summary>
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
                ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
            });
            return result;
        }

        basket.LineItems.Remove(discountLineItem);

        await CalculateBasketAsync(basket, countryCode, cancellationToken: cancellationToken);
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
            CurrencyCode = basket.Currency ?? _settings.StoreCurrencyCode,
            ShippingAddress = basket.ShippingAddress,
            AppliedDiscountIds = basket.LineItems
                .Where(li => li.LineItemType == LineItemType.Discount)
                .Select(li => li.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountId, out var id) &&
                              Guid.TryParse(id as string, out var parsedId)
                    ? parsedId
                    : Guid.Empty)
                .Where(id => id != Guid.Empty)
                .ToList()
        };

        // Convert basket line items to discount context line items
        foreach (var lineItem in basket.LineItems.Where(li => li.LineItemType == LineItemType.Product))
        {
            var ctxLineItem = new DiscountContextLineItem
            {
                LineItemId = lineItem.Id,
                ProductId = lineItem.ProductId ?? Guid.Empty,
                Sku = lineItem.Sku ?? string.Empty,
                Quantity = lineItem.Quantity,
                UnitPrice = lineItem.Amount,
                LineTotal = lineItem.Quantity * lineItem.Amount
            };

            // Read product metadata from ExtendedData (populated by CreateLineItem)
            if (lineItem.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.ProductRootId, out var rootIdObj) &&
                rootIdObj is string rootIdStr &&
                Guid.TryParse(rootIdStr, out var productRootId))
            {
                ctxLineItem.ProductRootId = productRootId;
            }

            if (lineItem.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.ProductTypeId, out var typeIdObj) &&
                typeIdObj is string typeIdStr &&
                Guid.TryParse(typeIdStr, out var productTypeId))
            {
                ctxLineItem.ProductTypeId = productTypeId;
            }

            if (lineItem.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.CollectionIds, out var collectionIdsObj) &&
                collectionIdsObj is string collectionIdsJson)
            {
                try
                {
                    ctxLineItem.CollectionIds = JsonSerializer.Deserialize<List<Guid>>(collectionIdsJson) ?? [];
                }
                catch
                {
                    // Ignore deserialization errors
                }
            }

            context.LineItems.Add(ctxLineItem);
        }

        return context;
    }

    // Order Grouping Methods

    /// <inheritdoc />
    public async Task<OrderGroupingResult> GetOrderGroupsAsync(
        Basket basket,
        CheckoutSession session,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(session.ShippingAddress.CountryCode))
        {
            return OrderGroupingResult.Fail("Shipping address must have a valid country code");
        }

        // Get all product IDs from basket line items
        var productIds = basket.LineItems
            .Where(li => li.ProductId.HasValue)
            .Select(li => li.ProductId!.Value)
            .Distinct()
            .ToList();

        // Load products with their shipping options
        var products = await productService.GetVariantsByIds(productIds, cancellationToken);
        var productDict = products.ToDictionary(p => p.Id);

        // Load all warehouses
        var warehouses = await warehouseService.GetWarehouses(cancellationToken);
        var warehouseDict = warehouses.ToDictionary(w => w.Id);

        // Build the context for the grouping strategy
        var context = new OrderGroupingContext
        {
            Basket = basket,
            BillingAddress = session.BillingAddress,
            ShippingAddress = session.ShippingAddress,
            CustomerId = basket.CustomerId,
            CustomerEmail = session.BillingAddress.Email,
            Products = productDict,
            Warehouses = warehouseDict,
            SelectedShippingOptions = session.SelectedShippingOptions
        };

        // Get the configured strategy and execute grouping
        var strategy = orderGroupingStrategyResolver.GetStrategy();
        return await strategy.GroupItemsAsync(context, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<Basket> SaveShippingSelectionsAsync(
        Basket basket,
        CheckoutSession session,
        Dictionary<Guid, Guid> selections,
        Dictionary<Guid, DateTime>? deliveryDates = null,
        CancellationToken cancellationToken = default)
    {
        // Update session with selections
        session.SelectedShippingOptions = selections;
        if (deliveryDates != null)
        {
            session.SelectedDeliveryDates = deliveryDates;
        }

        // Get order groups with the new selections to calculate shipping costs
        var groupingResult = await GetOrderGroupsAsync(basket, session, cancellationToken);

        if (!groupingResult.Success)
        {
            return basket;
        }

        // Calculate total shipping cost from selected options
        decimal totalShipping = 0;
        foreach (var group in groupingResult.Groups)
        {
            if (group.SelectedShippingOptionId.HasValue)
            {
                var selectedOption = group.AvailableShippingOptions
                    .FirstOrDefault(o => o.ShippingOptionId == group.SelectedShippingOptionId.Value);

                if (selectedOption != null)
                {
                    totalShipping += selectedOption.Cost;
                }
            }
        }

        // Update basket shipping cost
        basket.Shipping = totalShipping;
        basket.DateUpdated = DateTime.UtcNow;

        // Recalculate totals
        await CalculateBasketAsync(
            basket,
            session.ShippingAddress.CountryCode,
            cancellationToken: cancellationToken);

        return basket;
    }

    // Order Confirmation Methods

    /// <inheritdoc />
    public async Task<OrderConfirmationDto?> GetOrderConfirmationAsync(
        Guid invoiceId,
        CancellationToken cancellationToken = default)
    {
        // Load invoice with all related data
        var invoice = await invoiceService.GetInvoiceAsync(invoiceId, cancellationToken);

        if (invoice == null)
        {
            return null;
        }

        // Get currency symbol
        var currencySymbol = invoice.CurrencySymbol ?? _settings.CurrencySymbol;

        // Flatten line items from all orders (product items only)
        var lineItems = new List<CheckoutLineItemDto>();
        decimal totalShipping = 0;

        if (invoice.Orders != null)
        {
            foreach (var order in invoice.Orders)
            {
                totalShipping += order.ShippingCost;

                if (order.LineItems == null) continue;

                foreach (var li in order.LineItems.Where(l => l.LineItemType == LineItemType.Product))
                {
                    lineItems.Add(new CheckoutLineItemDto
                    {
                        Id = li.Id,
                        Sku = li.Sku ?? "",
                        Name = li.Name ?? "",
                        Quantity = li.Quantity,
                        UnitPrice = li.Amount,
                        LineTotal = li.Quantity * li.Amount,
                        FormattedUnitPrice = FormatPrice(li.Amount, currencySymbol),
                        FormattedLineTotal = FormatPrice(li.Quantity * li.Amount, currencySymbol),
                        LineItemType = li.LineItemType
                    });
                }
            }
        }

        // Get shipping method names
        var shippingOptionIds = invoice.Orders?
            .Where(o => o.ShippingOptionId != Guid.Empty)
            .Select(o => o.ShippingOptionId)
            .Distinct()
            .ToList() ?? [];

        var shippingOptionNames = shippingOptionIds.Count > 0
            ? await invoiceService.GetShippingOptionNamesAsync(shippingOptionIds, cancellationToken)
            : new Dictionary<Guid, string>();

        // Build shipment summaries
        var shipments = new List<ShipmentSummaryDto>();
        if (invoice.Orders != null)
        {
            foreach (var order in invoice.Orders)
            {
                var methodName = shippingOptionNames.TryGetValue(order.ShippingOptionId, out var name)
                    ? name
                    : "Shipping";

                shipments.Add(new ShipmentSummaryDto
                {
                    ShippingMethodName = methodName,
                    Cost = order.ShippingCost,
                    FormattedCost = FormatPrice(order.ShippingCost, currencySymbol)
                });
            }
        }

        // Get payment method info from first successful payment
        string? paymentMethod = null;
        if (invoice.Payments != null)
        {
            var successfulPayment = invoice.Payments.FirstOrDefault(p => p.PaymentSuccess);
            if (successfulPayment != null)
            {
                paymentMethod = successfulPayment.PaymentMethod ?? successfulPayment.PaymentProviderAlias;
            }
        }

        return new OrderConfirmationDto
        {
            InvoiceId = invoice.Id,
            InvoiceNumber = invoice.InvoiceNumber,
            OrderDate = invoice.DateCreated,
            CustomerEmail = invoice.BillingAddress.Email ?? "",
            BillingAddress = MapAddress(invoice.BillingAddress),
            ShippingAddress = MapAddress(invoice.ShippingAddress),
            LineItems = lineItems,
            SubTotal = invoice.SubTotal,
            FormattedSubTotal = FormatPrice(invoice.SubTotal, currencySymbol),
            Discount = invoice.Discount,
            FormattedDiscount = FormatPrice(invoice.Discount, currencySymbol),
            Shipping = totalShipping,
            FormattedShipping = FormatPrice(totalShipping, currencySymbol),
            Tax = invoice.Tax,
            FormattedTax = FormatPrice(invoice.Tax, currencySymbol),
            Total = invoice.Total,
            FormattedTotal = FormatPrice(invoice.Total, currencySymbol),
            CurrencySymbol = currencySymbol,
            Shipments = shipments,
            PaymentMethod = paymentMethod
        };
    }

    private static string FormatPrice(decimal price, string currencySymbol)
    {
        return $"{currencySymbol}{price:N2}";
    }

    private static CheckoutAddressDto MapAddress(Locality.Models.Address address)
    {
        return new CheckoutAddressDto
        {
            Name = address.Name,
            Company = address.Company,
            Address1 = address.AddressOne,
            Address2 = address.AddressTwo,
            City = address.TownCity,
            State = address.CountyState.Name,
            StateCode = address.CountyState.RegionCode,
            PostalCode = address.PostalCode,
            Country = address.Country,
            CountryCode = address.CountryCode,
            Phone = address.Phone
        };
    }

    private sealed class NoopLocationsService : ILocationsService
    {
        public Task<IReadOnlyCollection<CountryAvailability>> GetAvailableCountriesAsync(CancellationToken ct = default)
            => Task.FromResult<IReadOnlyCollection<CountryAvailability>>(Array.Empty<CountryAvailability>());

        public Task<IReadOnlyCollection<RegionAvailability>> GetAvailableRegionsAsync(string countryCode, CancellationToken ct = default)
            => Task.FromResult<IReadOnlyCollection<RegionAvailability>>(Array.Empty<RegionAvailability>());

        public Task<IReadOnlyCollection<CountryAvailability>> GetAvailableCountriesForWarehouseAsync(Guid warehouseId, CancellationToken ct = default)
            => Task.FromResult<IReadOnlyCollection<CountryAvailability>>(Array.Empty<CountryAvailability>());

        public Task<IReadOnlyCollection<RegionAvailability>> GetAvailableRegionsForWarehouseAsync(Guid warehouseId, string countryCode, CancellationToken ct = default)
            => Task.FromResult<IReadOnlyCollection<RegionAvailability>>(Array.Empty<RegionAvailability>());
    }
}
