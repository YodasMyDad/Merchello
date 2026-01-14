using System.Text.Json;
using Merchello.Core.Accounting.Extensions;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Checkout.Factories;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Strategies;
using Merchello.Core.Checkout.Strategies.Interfaces;
using Merchello.Core.Checkout.Strategies.Models;
using Merchello.Core.Data;
using Merchello.Core.Discounts.Models;
using Merchello.Core.Discounts.Services;
using Merchello.Core.Discounts.Services.Interfaces;
using Merchello.Core.Checkout.Notifications;
using Merchello.Core.ExchangeRates.Services.Interfaces;
using Merchello.Core.Notifications;
using Merchello.Core.Notifications.BasketNotifications;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Notifications.CheckoutNotifications;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Warehouses.Services.Interfaces;
using Merchello.Core.Warehouses.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Shared.RateLimiting.Interfaces;
using Merchello.Core.Locality.Services.Interfaces;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.Customers.Services.Parameters;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Checkout.Services;

public class CheckoutService(
    ILineItemService lineItemService,
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IHttpContextAccessor httpContextAccessor,
    IShippingQuoteService shippingQuoteService,
    IShippingCostResolver shippingCostResolver,
    BasketFactory basketFactory,
    LineItemFactory lineItemFactory,
    IMerchelloNotificationPublisher notificationPublisher,
    IOptions<MerchelloSettings> settings,
    IOrderGroupingStrategyResolver orderGroupingStrategyResolver,
    IProductService productService,
    IWarehouseService warehouseService,
    IInvoiceService invoiceService,
    ILocalityCatalog localityCatalog,
    ICheckoutSessionService checkoutSessionService,
    IRateLimiter rateLimiter,
    IExchangeRateCache exchangeRateCache,
    ICurrencyService currencyService,
    ILogger<CheckoutService> logger,
    IDiscountEngine? discountEngine = null,
    IDiscountService? discountService = null,
    ILocationsService? locationsService = null,
    ICheckoutMemberService? checkoutMemberService = null,
    ICustomerService? customerService = null,
    IAbandonedCheckoutService? abandonedCheckoutService = null) : ICheckoutService
{
    private readonly ILocationsService _locationsService = locationsService ?? new NoopLocationsService();
    private readonly MerchelloSettings _settings = settings.Value;

    // Rate limiting constants for discount code attempts
    private const int MaxDiscountCodeAttemptsPerMinute = 5;
    private static readonly TimeSpan DiscountCodeRateLimitWindow = TimeSpan.FromMinutes(1);

    // JSON serialization options - must match CheckoutSessionService for session interop
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    /// <summary>
    /// Add line item to the basket
    /// </summary>
    /// <param name="basket"></param>
    /// <param name="newLineItem"></param>
    /// <param name="countryCode"></param>
    /// <param name="cancellationToken"></param>
    public async Task AddToBasketAsync(Basket basket, LineItem newLineItem, string countryCode, CancellationToken cancellationToken = default)
    {
        // Load product for notification (only for product line items)
        Products.Models.Product? product = null;
        if (newLineItem.ProductId.HasValue)
        {
            product = await productService.GetProduct(
                new Products.Services.Parameters.GetProductParameters { ProductId = newLineItem.ProductId.Value },
                cancellationToken);
        }

        // Publish adding notification (cancelable) - only for product line items
        if (product != null)
        {
            var addingNotification = new BasketItemAddingNotification(basket, newLineItem, product, newLineItem.Quantity);
            if (await notificationPublisher.PublishCancelableAsync(addingNotification, cancellationToken))
            {
                basket.Errors.Add(new BasketError { Message = "Add to basket cancelled by notification handler", RelatedLineItemId = newLineItem.Id });
                return;
            }
        }

        basket.Errors = lineItemService.AddLineItem(basket.LineItems, newLineItem)
            .Select(x => new BasketError { Message = x, RelatedLineItemId = newLineItem.Id}).ToList();
        if (basket.Errors.Any())
        {
            return;
        }

        await CalculateBasketAsync(new CalculateBasketParameters { Basket = basket, CountryCode = countryCode }, cancellationToken);
        basket.DateUpdated = DateTime.UtcNow;

        // Publish added notification (informational) - only for product line items
        if (product != null)
        {
            await notificationPublisher.PublishAsync(new BasketItemAddedNotification(basket, newLineItem, product, newLineItem.Quantity), cancellationToken);
        }
    }

    /// <summary>
    /// Add a discount to the basket as a discount line item.
    /// </summary>
    /// <param name="parameters">Parameters for adding the discount</param>
    /// <param name="cancellationToken">Cancellation token</param>
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

        var currencyCode = basket.Currency ?? _settings.StoreCurrencyCode;
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

        await CalculateBasketAsync(new CalculateBasketParameters { Basket = basket, CountryCode = countryCode }, cancellationToken);
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

        await CalculateBasketAsync(new CalculateBasketParameters { Basket = basket, CountryCode = countryCode }, cancellationToken);
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
            await CalculateBasketAsync(new CalculateBasketParameters { Basket = basket, CountryCode = countryCode }, cancellationToken);
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
    /// Calculates basket totals including subtotal, tax, shipping, and discounts.
    /// </summary>
    /// <remarks>
    /// <para>
    /// <strong>Tax Preview vs Final Order:</strong> This method uses a simplified tax calculation
    /// with the provided <c>DefaultTaxRate</c> parameter for performance during checkout preview.
    /// The final order (created via <see cref="IInvoiceService.CreateOrderFromBasketAsync"/>)
    /// uses the active tax provider (e.g., Avalara, TaxJar) for accurate, address-based tax calculation.
    /// </para>
    /// <para>
    /// With external tax providers, the preview tax amount may differ from the final order tax.
    /// This is expected behavior as external providers calculate precise tax based on:
    /// - Exact shipping address (street-level precision)
    /// - Product tax categories
    /// - Current tax rates from tax authority databases
    /// </para>
    /// <para>
    /// For high-value carts or jurisdictions with complex tax rules, consider calling
    /// the tax provider during preview if exact tax amounts are required before order confirmation.
    /// </para>
    /// </remarks>
    /// <param name="parameters">Parameters for calculating the basket</param>
    /// <param name="cancellationToken">Cancellation token</param>
    public async Task CalculateBasketAsync(CalculateBasketParameters parameters, CancellationToken cancellationToken = default)
    {
        var basket = parameters.Basket;
        var countryCode = parameters.CountryCode;
        var defaultTaxRate = parameters.DefaultTaxRate;
        var isShippingTaxable = parameters.IsShippingTaxable;

        // Resolve country code from settings if not provided
        var resolvedCountryCode = countryCode ?? _settings.DefaultShippingCountry ?? "US";

        basket.Errors = basket.Errors.Where(error => !error.IsShippingError).ToList();

        var stateCode = basket.ShippingAddress.CountyState.RegionCode;
        var shippingQuotes = (await shippingQuoteService
            .GetQuotesAsync(basket, resolvedCountryCode, stateCode, cancellationToken))
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

        // Use shipping amount in this priority:
        // 1. Explicit override (from order grouping selection)
        // 2. Existing basket shipping (already calculated via order grouping)
        // 3. Auto-calculate from quotes (fallback for initial basket creation)
        var shippingCost = parameters.ShippingAmountOverride
            ?? (basket.Shipping > 0
                ? basket.Shipping
                : shippingQuotes
                    .Sum(q => q.ServiceLevels
                        .OrderBy(level => level.TotalCost)
                        .Select(level => level.TotalCost)
                        .FirstOrDefault()));

        var currencyCode = basket.Currency ?? _settings.StoreCurrencyCode;

        // Use the unified calculation method that handles discount line items
        var calcResult = lineItemService.CalculateFromLineItems(new CalculateLineItemsParameters
        {
            LineItems = basket.LineItems,
            ShippingAmount = shippingCost,
            DefaultTaxRate = defaultTaxRate,
            CurrencyCode = currencyCode,
            IsShippingTaxable = isShippingTaxable
        });

        basket.SubTotal = calcResult.SubTotal;
        basket.Discount = calcResult.Discount;
        basket.AdjustedSubTotal = calcResult.AdjustedSubTotal;
        basket.Tax = calcResult.Tax;
        basket.Total = calcResult.Total;
        basket.Shipping = calcResult.Shipping;
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
            basket = JsonSerializer.Deserialize<Basket>(basketInSession, JsonOptions);
            if (basket != null) return basket;
        }

        Basket? anonBasket = null;
        Basket? userBasket = null;

        using var scope = efCoreScopeProvider.CreateScope();
        basket = await scope.ExecuteWithContextAsync(async db =>
        {
            if (parameters.CustomerId.HasValue)
            {
                // User is logged in (LineItems stored as JSON, loaded automatically)
                userBasket = await db.Baskets
                    .FirstOrDefaultAsync(b => b.CustomerId == parameters.CustomerId, cancellationToken);
            }

            // User is not logged in or has items added before logging in, retrieve using cookie
            var basketId = httpContext?.Request.Cookies[Constants.Cookies.BasketId];
            if (!string.IsNullOrEmpty(basketId) && Guid.TryParse(basketId, out var parsedBasketId))
            {
                // LineItems stored as JSON, loaded automatically with basket
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
            httpContext?.Session.SetString("Basket", JsonSerializer.Serialize(basket, JsonOptions));
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
                var fallbackCountryCode = _settings.DefaultShippingCountry ?? "US";
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
                httpContextAccessor.HttpContext?.Session.SetString("Basket", JsonSerializer.Serialize(basket, JsonOptions));
            }
        }
    }

    /// <inheritdoc />
    public async Task<AddProductWithAddonsResult> AddProductWithAddonsAsync(
        AddProductWithAddonsParameters parameters,
        CancellationToken cancellationToken = default)
    {
        // Get the product (variant) with ProductRoot - ProductOptions is JSON so automatically loaded with ProductRoot
        var product = await productService.GetProduct(new Products.Services.Parameters.GetProductParameters
        {
            ProductId = parameters.ProductId,
            IncludeProductRoot = true, // ProductOptions (JSON column) loads with ProductRoot for display name extraction
            IncludeTaxGroup = true,
            NoTracking = true
        }, cancellationToken);

        if (product == null)
        {
            return AddProductWithAddonsResult.Failed("Product not found");
        }

        // Check if product is available for purchase
        // Note: Stock validation happens at order submission time via IInventoryService.
        // The AvailableForPurchase flag reflects current stock availability status.
        if (!product.AvailableForPurchase)
        {
            return AddProductWithAddonsResult.Failed("This product is currently out of stock");
        }

        // Create the main product line item
        var productLineItem = CreateLineItem(product, parameters.Quantity);

        // Add main product to basket
        await AddToBasket(new AddToBasketParameters
        {
            ItemToAdd = productLineItem,
            CustomerId = parameters.CustomerId
        }, cancellationToken);

        // Handle add-ons if any
        var addonLineItems = new List<LineItem>();

        if (parameters.Addons.Count > 0 && product.ProductRoot?.ProductOptions != null)
        {
            var addonOptions = product.ProductRoot.ProductOptions
                .Where(po => !po.IsVariant)
                .ToList();

            var valueLookup = addonOptions
                .SelectMany(o => o.ProductOptionValues.Select(v => (Option: o, Value: v)))
                .ToDictionary(x => x.Value.Id, x => x);

            foreach (var addon in parameters.Addons)
            {
                if (!valueLookup.TryGetValue(addon.ValueId, out var ov))
                    continue;

                // Create addon line item
                var addonLineItem = new LineItem
                {
                    Id = Guid.NewGuid(),
                    Name = $"{ov.Option.Name}: {ov.Value.Name}",
                    Sku = string.IsNullOrWhiteSpace(ov.Value.SkuSuffix)
                        ? $"ADDON-{ov.Value.Id.ToString()[..8]}"
                        : $"{product.Sku}-{ov.Value.SkuSuffix}",
                    DependantLineItemSku = productLineItem.Sku,
                    Quantity = parameters.Quantity,
                    Amount = ov.Value.PriceAdjustment,
                    LineItemType = LineItemType.Addon,
                    IsTaxable = true,
                    TaxRate = product.ProductRoot.TaxGroup?.TaxPercentage ?? 20m
                };

                addonLineItem.ExtendedData["AddonOptionId"] = ov.Option.Id.ToString();
                addonLineItem.ExtendedData["AddonValueId"] = ov.Value.Id.ToString();
                addonLineItem.ExtendedData["CostAdjustment"] = ov.Value.CostAdjustment;
                addonLineItem.ExtendedData["WeightKg"] = ov.Value.WeightKg ?? 0m;

                await AddToBasket(new AddToBasketParameters
                {
                    ItemToAdd = addonLineItem,
                    CustomerId = parameters.CustomerId
                }, cancellationToken);

                addonLineItems.Add(addonLineItem);
            }
        }

        // Get updated basket to return
        var basket = await GetBasket(new GetBasketParameters { CustomerId = parameters.CustomerId }, cancellationToken);

        return basket != null
            ? AddProductWithAddonsResult.Successful(basket, productLineItem, addonLineItems)
            : AddProductWithAddonsResult.Failed("Failed to retrieve basket after adding items");
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
                // Note: Stock validation happens at order submission time via IInventoryService.
                // The basket accepts any quantity; final validation occurs when creating the order.
                lineItem.Quantity = quantity;
                basket.DateUpdated = DateTime.UtcNow;
                await CalculateBasketAsync(new CalculateBasketParameters { Basket = basket, CountryCode = countryCode }, cancellationToken);

                using var scope = efCoreScopeProvider.CreateScope();
                await scope.ExecuteWithContextAsync<Task>(async db =>
                {
                    db.Baskets.Update(basket);
                    await db.SaveChangesAsync(cancellationToken);
                });
                scope.Complete();

                // Update session with modified basket
                httpContextAccessor.HttpContext?.Session.SetString("Basket", JsonSerializer.Serialize(basket, JsonOptions));

                // Track checkout activity for abandoned cart recovery (if checkout started)
                if (abandonedCheckoutService != null)
                {
                    await abandonedCheckoutService.TrackCheckoutActivityAsync(basket.Id, cancellationToken);
                }
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
            httpContextAccessor.HttpContext?.Session.SetString("Basket", JsonSerializer.Serialize(basket, JsonOptions));
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
                .AsSplitQuery()
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
                        .GetShippingAmountForCountry(product, countryCode, r.RegionCode, shippingCostResolver)
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
    /// Gets all countries from the locality catalog (for billing address which has no restrictions).
    /// </summary>
    public Task<IReadOnlyCollection<CountryInfo>> GetAllCountriesAsync(CancellationToken cancellationToken = default)
        => localityCatalog.GetCountriesAsync(cancellationToken);

    /// <summary>
    /// Gets all regions for a country from the locality catalog (for billing address which has no restrictions).
    /// </summary>
    public Task<IReadOnlyCollection<SubdivisionInfo>> GetAllRegionsAsync(string countryCode, CancellationToken cancellationToken = default)
        => localityCatalog.GetRegionsAsync(countryCode, cancellationToken);

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
    /// Updates the customer's display currency preference without converting basket amounts.
    /// Basket amounts always remain in store currency; display conversion happens at render time.
    /// </summary>
    public async Task<CrudResult<Basket>> ConvertBasketCurrencyAsync(
        ConvertBasketCurrencyParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Basket>();
        var newCurrencyCode = parameters.NewCurrencyCode;

        // Get the current basket
        var basket = await GetBasket(new GetBasketParameters(), cancellationToken);

        // If basket is empty or null, nothing to do - just return success
        if (basket == null || basket.LineItems.Count == 0)
        {
            result.ResultObject = basket;
            return result;
        }

        // Store currency is the source of truth - use it for exchange rate lookup
        var storeCurrencyCode = _settings.StoreCurrencyCode;

        // If requested currency is the same as store currency, no exchange rate needed
        if (string.Equals(storeCurrencyCode, newCurrencyCode, StringComparison.OrdinalIgnoreCase))
        {
            result.ResultObject = basket;
            return result;
        }

        // Get exchange rate: store currency → display currency (for notification context only)
        var rate = await exchangeRateCache.GetRateAsync(storeCurrencyCode, newCurrencyCode, cancellationToken);

        if (rate == null)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = $"Exchange rate unavailable: {storeCurrencyCode} → {newCurrencyCode}. Unable to change display currency.",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        // Publish "Before" notification - handlers can cancel
        var changingNotification = new BasketCurrencyChangingNotification(
            basket, storeCurrencyCode, newCurrencyCode, rate.Value);

        if (await notificationPublisher.PublishCancelableAsync(changingNotification, cancellationToken))
        {
            result.Messages.Add(new ResultMessage
            {
                Message = changingNotification.CancelReason ?? "Currency change cancelled.",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        // NOTE: We intentionally do NOT modify basket amounts here.
        // Basket amounts always stay in store currency.
        // Display conversion happens at render time using DisplayCurrencyExtensions.

        // Update display preference only - NO amount conversion (Shopify approach)
        basket.Currency = newCurrencyCode;
        basket.CurrencySymbol = currencyService.GetCurrency(newCurrencyCode).Symbol;
        basket.DateUpdated = DateTime.UtcNow;

        await SaveBasketAsync(basket, cancellationToken);

        // Publish "After" notification (rate provided for notification handlers that need it)
        await notificationPublisher.PublishAsync(
            new BasketCurrencyChangedNotification(basket, storeCurrencyCode, newCurrencyCode, rate.Value),
            cancellationToken);

        result.ResultObject = basket;
        return result;
    }

    /// <summary>
    /// Creates a line item for a product with metadata for discount matching and display
    /// </summary>
    public LineItem CreateLineItem(Products.Models.Product product, int quantity = 1)
    {
        var lineItem = lineItemFactory.CreateFromProduct(product, quantity);

        // Add product metadata for discount matching (used by discount engine for targeting)
        lineItem.ExtendedData[Constants.ExtendedDataKeys.ProductRootId] = product.ProductRootId.ToString();

        // ProductRoot must be loaded for ProductTypeId, Categories, and display data
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

            // Store root name for display (e.g., "Premium V-Neck" instead of variant name "S-Grey")
            lineItem.ExtendedData[Constants.ExtendedDataKeys.ProductRootName] = productRoot.RootName ?? "";

            // Store variant name as fallback when options can't be extracted
            if (!string.IsNullOrWhiteSpace(product.Name) && product.Name != productRoot.RootName)
            {
                lineItem.ExtendedData[Constants.ExtendedDataKeys.VariantName] = product.Name;
            }

            // Extract and store selected option name/value pairs for display
            if (!string.IsNullOrWhiteSpace(product.VariantOptionsKey))
            {
                var optionCount = productRoot.ProductOptions?.Count ?? 0;
                logger.LogDebug(
                    "CreateLineItem: Product {ProductId} has VariantOptionsKey={Key}, ProductOptions.Count={OptionCount}",
                    product.Id, product.VariantOptionsKey, optionCount);

                if (optionCount > 0)
                {
                    var selectedOptions = ExtractSelectedOptions(product.VariantOptionsKey, productRoot.ProductOptions!);
                    logger.LogDebug("CreateLineItem: ExtractSelectedOptions returned {Count} options", selectedOptions.Count);

                    if (selectedOptions.Count > 0)
                    {
                        lineItem.ExtendedData[Constants.ExtendedDataKeys.SelectedOptions] =
                            JsonSerializer.Serialize(selectedOptions);
                    }
                }
            }
        }

        return lineItem;
    }

    /// <summary>
    /// Extracts selected option name/value pairs from a variant options key.
    /// </summary>
    private static List<Accounting.Models.SelectedOption> ExtractSelectedOptions(
        string variantOptionsKey,
        List<Products.Models.ProductOption> productOptions)
    {
        // Parse VariantOptionsKey - comma-separated GUIDs (simple split)
        var keyParts = variantOptionsKey.Split(',')
            .Select(k => Guid.TryParse(k.Trim(), out var g) ? g : (Guid?)null)
            .Where(g => g.HasValue)
            .Select(g => g!.Value)
            .ToHashSet();

        var selected = new List<Accounting.Models.SelectedOption>();
        foreach (var option in productOptions.Where(o => o.IsVariant).OrderBy(o => o.SortOrder))
        {
            var matchingValue = option.ProductOptionValues
                .FirstOrDefault(v => keyParts.Contains(v.Id));

            if (matchingValue != null)
            {
                selected.Add(new Accounting.Models.SelectedOption
                {
                    OptionName = option.Name ?? "",
                    ValueName = matchingValue.Name ?? ""
                });
            }
        }

        return selected;
    }

    /// <summary>
    /// Applies a discount code to the basket.
    /// Rate limited to prevent brute-force attacks on discount codes.
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

        // Rate limiting: Check if too many discount code attempts
        var rateLimitResult = await CheckDiscountCodeRateLimitAsync(basket.Id, cancellationToken);
        if (!rateLimitResult.Allowed)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = rateLimitResult.ErrorMessage ?? "Too many discount code attempts. Please try again later.",
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
                ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
            });
            return result;
        }

        await CalculateBasketAsync(new CalculateBasketParameters { Basket = basket, CountryCode = countryCode }, cancellationToken);

        // Refresh automatic discounts - the applied code may conflict with existing automatic discounts
        // This is done here (not in controller) to ensure consistent behavior across all code paths
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
        var currencyCode = basket.Currency ?? _settings.StoreCurrencyCode;
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

        await CalculateBasketAsync(new CalculateBasketParameters
        {
            Basket = basket,
            CountryCode = countryCode,
            ShippingAmountOverride = basket.Shipping  // Preserve existing shipping amount
        }, cancellationToken);
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

        await CalculateBasketAsync(new CalculateBasketParameters { Basket = basket, CountryCode = countryCode }, cancellationToken);

        // Refresh automatic discounts - a removed code may have been blocking automatic discounts
        // This is done here (not in controller) to ensure consistent behavior across all code paths
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

        // Build lookup of product line items by SKU for add-on parent linking
        var productLineItemsBySku = basket.LineItems
            .Where(li => li.LineItemType == LineItemType.Product && !string.IsNullOrEmpty(li.Sku))
            .ToDictionary(li => li.Sku!, li => li);

        // Convert basket line items to discount context line items (products and add-ons)
        foreach (var lineItem in basket.LineItems.Where(li =>
            li.LineItemType == LineItemType.Product || li.LineItemType == LineItemType.Addon))
        {
            var isAddon = lineItem.LineItemType == LineItemType.Addon;
            LineItem? parentLineItem = null;

            // For add-ons, find the parent product line item
            if (isAddon && !string.IsNullOrEmpty(lineItem.DependantLineItemSku))
            {
                productLineItemsBySku.TryGetValue(lineItem.DependantLineItemSku, out parentLineItem);
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
    public async Task<CrudResult<Basket>> SaveAddressesAsync(
        SaveAddressesParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var basket = parameters.Basket;
        var result = new CrudResult<Basket>();

        // Map DTOs to Address models
        var billingAddress = MapDtoToAddress(parameters.BillingAddress);
        billingAddress.Email = parameters.Email;

        var shippingAddress = parameters.ShippingSameAsBilling
            ? billingAddress
            : MapDtoToAddress(parameters.ShippingAddress ?? parameters.BillingAddress);

        if (!parameters.ShippingSameAsBilling && parameters.ShippingAddress != null)
        {
            shippingAddress.Email = parameters.Email;
        }

        // Publish "Before" notification - handlers can cancel or modify addresses
        var changingNotification = new CheckoutAddressesChangingNotification(
            basket, billingAddress, shippingAddress, parameters.ShippingSameAsBilling);

        if (await notificationPublisher.PublishCancelableAsync(changingNotification, cancellationToken))
        {
            result.Messages.Add(new ResultMessage
            {
                Message = changingNotification.CancelReason ?? "Address change cancelled",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        // Use potentially modified addresses from handlers
        billingAddress = changingNotification.BillingAddress;
        shippingAddress = changingNotification.ShippingAddress;

        // Update basket addresses
        basket.BillingAddress = billingAddress;
        basket.ShippingAddress = shippingAddress;
        basket.DateUpdated = DateTime.UtcNow;

        // Recalculate with the new shipping address country
        await CalculateBasketAsync(new CalculateBasketParameters
        {
            Basket = basket,
            CountryCode = shippingAddress.CountryCode
        }, cancellationToken);

        // Apply automatic discounts (e.g., "Free shipping in UK", "10% off orders over £100")
        basket = await RefreshAutomaticDiscountsAsync(basket, shippingAddress.CountryCode, cancellationToken);

        // Save to database
        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            db.Baskets.Update(basket);
            await db.SaveChangesAsync(cancellationToken);
        });
        scope.Complete();

        // Update HTTP session
        httpContextAccessor.HttpContext?.Session.SetString("Basket", JsonSerializer.Serialize(basket, JsonOptions));

        // Update checkout session
        await checkoutSessionService.SaveAddressesAsync(
            basket.Id,
            billingAddress,
            shippingAddress,
            parameters.ShippingSameAsBilling,
            parameters.AcceptsMarketing,
            cancellationToken);

        await checkoutSessionService.SetCurrentStepAsync(basket.Id, CheckoutStep.Shipping, cancellationToken);

        // Publish "After" notification
        await notificationPublisher.PublishAsync(
            new CheckoutAddressesChangedNotification(basket, billingAddress, shippingAddress, parameters.ShippingSameAsBilling),
            cancellationToken);

        // Track checkout activity for abandoned cart recovery (creates record on first email capture)
        if (abandonedCheckoutService != null && !string.IsNullOrWhiteSpace(parameters.Email))
        {
            await abandonedCheckoutService.TrackCheckoutActivityAsync(basket, parameters.Email, cancellationToken);
        }

        // Create member account if password provided
        if (!string.IsNullOrWhiteSpace(parameters.Password) && checkoutMemberService != null && customerService != null)
        {
            try
            {
                var memberKey = await checkoutMemberService.CreateMemberAsync(
                    new CreateCheckoutMemberParameters
                    {
                        Email = parameters.Email,
                        Password = parameters.Password,
                        Name = billingAddress.Name ?? parameters.Email
                    }, cancellationToken);

                if (memberKey.HasValue)
                {
                    // Get or create customer and link to member
                    var customer = await customerService.GetOrCreateByEmailAsync(parameters.Email, ct: cancellationToken);
                    if (customer != null && !customer.MemberKey.HasValue)
                    {
                        await customerService.UpdateAsync(new UpdateCustomerParameters
                        {
                            Id = customer.Id,
                            MemberKey = memberKey
                        }, cancellationToken);
                        logger.LogInformation("Created member account and linked to customer {CustomerId} for email {Email}",
                            customer.Id, parameters.Email);
                    }
                }
            }
            catch (Exception ex)
            {
                // Log but don't fail checkout - account creation is optional
                logger.LogWarning(ex, "Failed to create member account for {Email} during checkout", parameters.Email);
            }
        }

        result.ResultObject = basket;
        return result;
    }

    private static Locality.Models.Address MapDtoToAddress(CheckoutAddressDto dto)
    {
        return new Locality.Models.Address
        {
            Name = dto.Name,
            Company = dto.Company,
            AddressOne = dto.Address1,
            AddressTwo = dto.Address2,
            TownCity = dto.City,
            CountyState = new CountyState
            {
                Name = dto.State,
                RegionCode = dto.StateCode
            },
            PostalCode = dto.PostalCode,
            Country = dto.Country,
            CountryCode = dto.CountryCode,
            Phone = dto.Phone
        };
    }

    /// <inheritdoc />
    public async Task SaveBasketAsync(Basket basket, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            db.Baskets.Update(basket);
            await db.SaveChangesAsync(cancellationToken);
        });
        scope.Complete();

        // Update HTTP session to keep in sync
        httpContextAccessor.HttpContext?.Session.SetString("Basket", JsonSerializer.Serialize(basket, JsonOptions));
    }

    /// <inheritdoc />
    public async Task<CrudResult<Basket>> SaveShippingSelectionsAsync(
        SaveShippingSelectionsParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var basket = parameters.Basket;
        var session = parameters.Session;
        var selections = parameters.Selections;
        var deliveryDates = parameters.DeliveryDates;

        // Publish "Before" notification - handlers can cancel or modify selections
        var changingNotification = new ShippingSelectionChangingNotification(basket, new Dictionary<Guid, Guid>(selections));

        if (await notificationPublisher.PublishCancelableAsync(changingNotification, cancellationToken))
        {
            var result = new CrudResult<Basket>();
            result.Messages.Add(new ResultMessage
            {
                Message = changingNotification.CancelReason ?? "Shipping selection change cancelled",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        // Use potentially modified selections from handlers
        selections = changingNotification.ShippingSelections;

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
            var result = new CrudResult<Basket>();
            foreach (var error in groupingResult.Errors)
            {
                result.Messages.Add(new ResultMessage { Message = error, ResultMessageType = ResultMessageType.Error });
            }
            return result;
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

        basket.DateUpdated = DateTime.UtcNow;

        // Recalculate totals with the selected shipping amount
        await CalculateBasketAsync(new CalculateBasketParameters
        {
            Basket = basket,
            CountryCode = session.ShippingAddress.CountryCode,
            ShippingAmountOverride = totalShipping
        }, cancellationToken);

        // Refresh automatic discounts (shipping costs may affect free shipping thresholds)
        basket = await RefreshAutomaticDiscountsAsync(
            basket,
            session.ShippingAddress.CountryCode,
            cancellationToken);

        // Save basket to database
        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            db.Baskets.Update(basket);
            await db.SaveChangesAsync(cancellationToken);
        });
        scope.Complete();

        // Update HTTP session
        httpContextAccessor.HttpContext?.Session.SetString("Basket", JsonSerializer.Serialize(basket, JsonOptions));

        // Persist shipping selections to checkout session
        await checkoutSessionService.SaveShippingSelectionsAsync(
            basket.Id,
            selections,
            deliveryDates,
            cancellationToken);

        // Set checkout step to Payment
        await checkoutSessionService.SetCurrentStepAsync(basket.Id, CheckoutStep.Payment, cancellationToken);

        // Publish "After" notification
        await notificationPublisher.PublishAsync(
            new ShippingSelectionChangedNotification(basket, selections),
            cancellationToken);

        // Track checkout activity for abandoned cart recovery
        if (abandonedCheckoutService != null)
        {
            await abandonedCheckoutService.TrackCheckoutActivityAsync(basket.Id, cancellationToken);
        }

        return new CrudResult<Basket> { ResultObject = basket };
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

        // Use invoice's currency (the currency the order was placed in)
        var currencyCode = invoice.CurrencyCode ?? _settings.StoreCurrencyCode;
        var currencySymbol = invoice.CurrencySymbol ?? _settings.CurrencySymbol;

        // Flatten line items from all orders (products and add-ons)
        List<CheckoutLineItemDto> lineItems = [];
        decimal totalShipping = 0;

        if (invoice.Orders != null)
        {
            foreach (var order in invoice.Orders)
            {
                totalShipping += order.ShippingCost;

                if (order.LineItems == null) continue;

                foreach (var li in order.LineItems.Where(l =>
                    l.LineItemType == LineItemType.Product || l.LineItemType == LineItemType.Addon))
                {
                    var lineTotal = li.Quantity * li.Amount;

                    // Get display data from ExtendedData
                    var imageUrl = li.ExtendedData?.GetValueOrDefault("ImageUrl")?.ToString();
                    var productRootName = li.GetProductRootName();
                    var selectedOptions = li.GetSelectedOptions()
                        .Select(o => new SelectedOptionDto
                        {
                            OptionName = o.OptionName,
                            ValueName = o.ValueName
                        }).ToList();

                    lineItems.Add(new CheckoutLineItemDto
                    {
                        Id = li.Id,
                        Sku = li.Sku ?? "",
                        Name = li.Name ?? "",
                        ProductRootName = productRootName,
                        SelectedOptions = selectedOptions,
                        Quantity = li.Quantity,
                        UnitPrice = li.Amount,
                        LineTotal = lineTotal,
                        FormattedUnitPrice = FormatPrice(li.Amount, currencySymbol),
                        FormattedLineTotal = FormatPrice(lineTotal, currencySymbol),
                        // Display fields match store currency (no conversion in core service)
                        DisplayUnitPrice = li.Amount,
                        DisplayLineTotal = lineTotal,
                        FormattedDisplayUnitPrice = FormatPrice(li.Amount, currencySymbol),
                        FormattedDisplayLineTotal = FormatPrice(lineTotal, currencySymbol),
                        LineItemType = li.LineItemType,
                        ImageUrl = imageUrl
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
        List<ShipmentSummaryDto> shipments = [];
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
            BillingAddress = await MapAddressAsync(invoice.BillingAddress),
            ShippingAddress = await MapAddressAsync(invoice.ShippingAddress),
            LineItems = lineItems,

            // Store currency amounts
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

            // Display currency matches store currency (no conversion in core service)
            // Storefront layer can apply currency conversion if needed
            DisplayCurrencyCode = currencyCode,
            DisplayCurrencySymbol = currencySymbol,
            ExchangeRate = 1m,
            DisplaySubTotal = invoice.SubTotal,
            FormattedDisplaySubTotal = FormatPrice(invoice.SubTotal, currencySymbol),
            DisplayDiscount = invoice.Discount,
            FormattedDisplayDiscount = FormatPrice(invoice.Discount, currencySymbol),
            DisplayShipping = totalShipping,
            FormattedDisplayShipping = FormatPrice(totalShipping, currencySymbol),
            DisplayTax = invoice.Tax,
            FormattedDisplayTax = FormatPrice(invoice.Tax, currencySymbol),
            DisplayTotal = invoice.Total,
            FormattedDisplayTotal = FormatPrice(invoice.Total, currencySymbol),

            Shipments = shipments,
            PaymentMethod = paymentMethod,

            // Order status
            IsCancelled = invoice.IsCancelled,
            CancellationReason = invoice.CancellationReason,
            IsRefunded = invoice.Payments?
                .Where(p => p.PaymentType == Payments.Models.PaymentType.Refund ||
                           p.PaymentType == Payments.Models.PaymentType.PartialRefund)
                .Sum(p => Math.Abs(p.Amount)) >= invoice.Total
        };
    }

    // Single-page checkout methods

    /// <inheritdoc />
    public async Task<CrudResult<InitializeCheckoutResult>> InitializeCheckoutAsync(
        InitializeCheckoutParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var basket = parameters.Basket;
        var result = new CrudResult<InitializeCheckoutResult>();

        // Validate country code
        if (string.IsNullOrWhiteSpace(parameters.CountryCode))
        {
            result.Messages.Add(new ResultMessage
            {
                Message = "Country code is required",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        // Create minimal shipping address with country/state for calculation
        var shippingAddress = new Locality.Models.Address
        {
            CountryCode = parameters.CountryCode,
            CountyState = !string.IsNullOrEmpty(parameters.StateCode)
                ? new Locality.Models.CountyState { RegionCode = parameters.StateCode }
                : new Locality.Models.CountyState(),
            Email = parameters.Email ?? string.Empty
        };

        // Update basket with shipping address for calculation purposes
        basket.ShippingAddress = shippingAddress;
        // Also update billing address country to match (storefront selection takes precedence)
        basket.BillingAddress.CountryCode = parameters.CountryCode;
        basket.DateUpdated = DateTime.UtcNow;

        // Calculate basket with shipping country
        await CalculateBasketAsync(new CalculateBasketParameters
        {
            Basket = basket,
            CountryCode = parameters.CountryCode
        }, cancellationToken);

        // Get or create checkout session
        var session = await checkoutSessionService.GetSessionAsync(basket.Id, cancellationToken);
        session.ShippingAddress = shippingAddress;

        // Get order groups with shipping options
        var groupingResult = await GetOrderGroupsAsync(basket, session, cancellationToken);

        // Add any grouping errors to basket.Errors so frontend can display item-level shipping errors
        // (e.g., "Product X cannot be shipped to Country Y")
        foreach (var error in groupingResult.Errors)
        {
            basket.Errors.Add(new BasketError
            {
                Message = error,
                IsShippingError = true
            });
        }

        // If there are no valid shipping groups at all (complete failure), add to result messages
        // but continue processing to return the basket with errors for the frontend
        if (!groupingResult.Success && groupingResult.Groups.Count == 0)
        {
            foreach (var error in groupingResult.Errors)
            {
                result.Messages.Add(new ResultMessage { Message = error, ResultMessageType = ResultMessageType.Error });
            }
        }

        // Auto-select cheapest shipping if requested
        var autoSelectedOptions = new Dictionary<Guid, Guid>();
        decimal combinedShippingTotal = 0;

        if (parameters.AutoSelectCheapestShipping && groupingResult.Groups.Count > 0)
        {
            // Use the auto-selector utility
            autoSelectedOptions = ShippingAutoSelector.SelectOptions(
                groupingResult.Groups,
                ShippingAutoSelectStrategy.Cheapest);

            // Apply selections to groups
            ShippingAutoSelector.ApplySelectionsToGroups(groupingResult.Groups, autoSelectedOptions);

            // Calculate combined shipping total
            combinedShippingTotal = ShippingAutoSelector.CalculateCombinedTotal(
                groupingResult.Groups,
                autoSelectedOptions);

            // Recalculate totals with the auto-selected shipping amount
            await CalculateBasketAsync(new CalculateBasketParameters
            {
                Basket = basket,
                CountryCode = parameters.CountryCode,
                ShippingAmountOverride = combinedShippingTotal
            }, cancellationToken);

            // Save auto-selections to session
            await checkoutSessionService.SaveShippingSelectionsAsync(
                basket.Id,
                autoSelectedOptions,
                null,
                cancellationToken);
        }

        // Refresh automatic discounts (may include free shipping based on threshold)
        basket = await RefreshAutomaticDiscountsAsync(basket, parameters.CountryCode, cancellationToken);

        // Save basket to database
        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            db.Baskets.Update(basket);
            await db.SaveChangesAsync(cancellationToken);
        });
        scope.Complete();

        // Update HTTP session
        httpContextAccessor.HttpContext?.Session.SetString("Basket", JsonSerializer.Serialize(basket, JsonOptions));

        // Update checkout session with shipping address
        await checkoutSessionService.SaveAddressesAsync(
            basket.Id,
            shippingAddress,
            shippingAddress,
            sameAsBilling: true,
            acceptsMarketing: false,
            cancellationToken);

        result.ResultObject = new InitializeCheckoutResult
        {
            Basket = basket,
            GroupingResult = groupingResult,
            AutoSelectedShippingOptions = autoSelectedOptions,
            CombinedShippingTotal = combinedShippingTotal,
            ShippingAutoSelected = parameters.AutoSelectCheapestShipping && autoSelectedOptions.Count > 0
        };

        return result;
    }

    private static string FormatPrice(decimal price, string currencySymbol)
    {
        return $"{currencySymbol}{price:N2}";
    }

    private async Task<CheckoutAddressDto> MapAddressAsync(Locality.Models.Address address)
    {
        // Look up country name from code if not set
        var countryName = address.Country;
        if (string.IsNullOrEmpty(countryName) && !string.IsNullOrEmpty(address.CountryCode))
        {
            countryName = await localityCatalog.TryGetCountryNameAsync(address.CountryCode);
        }

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
            Country = countryName,
            CountryCode = address.CountryCode,
            Phone = address.Phone
        };
    }

    /// <summary>
    /// Checks rate limit for discount code attempts.
    /// Returns whether the request is allowed and atomically increments the counter.
    /// </summary>
    private Task<(bool Allowed, string? ErrorMessage)> CheckDiscountCodeRateLimitAsync(
        Guid basketId,
        CancellationToken cancellationToken)
    {
        var rateLimitKey = $"discount-code-attempts:{basketId}";

        // Use atomic rate limiter - check and increment happen together
        var result = rateLimiter.TryAcquire(rateLimitKey, MaxDiscountCodeAttemptsPerMinute, DiscountCodeRateLimitWindow);

        if (!result.IsAllowed)
        {
            var retryMessage = result.RetryAfter.HasValue
                ? $" Please wait {result.RetryAfter.Value.TotalSeconds:F0} seconds before trying again."
                : " Please wait a minute before trying again.";
            return Task.FromResult<(bool, string?)>((false, $"Too many discount code attempts.{retryMessage}"));
        }

        return Task.FromResult<(bool, string?)>((true, null));
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
