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
using Merchello.Core.Locality.Services.Interfaces;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.Customers.Services.Parameters;
using Merchello.Core.Tax.Providers.Interfaces;
using Merchello.Core.Protocols;
using Merchello.Core.Protocols.Models;
using Merchello.Core.Shared.Providers;
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
    IExchangeRateCache exchangeRateCache,
    ICurrencyService currencyService,
    ILogger<CheckoutService> logger,
    ILocationsService? locationsService = null,
    ICheckoutMemberService? checkoutMemberService = null,
    ICustomerService? customerService = null,
    IAbandonedCheckoutService? abandonedCheckoutService = null,
    ITaxProviderManager? taxProviderManager = null,
    ITaxService? taxService = null,
    Lazy<ICheckoutDiscountService>? checkoutDiscountService = null) : ICheckoutService
{
    private readonly ILocationsService _locationsService = locationsService ?? new NoopLocationsService();
    private readonly MerchelloSettings _settings = settings.Value;

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
            var removingNotification = new BasketItemRemovingNotification(basket, itemToRemove);
            if (await notificationPublisher.PublishCancelableAsync(removingNotification, cancellationToken))
            {
                basket.Errors.Add(new()
                {
                    Message = removingNotification.CancelReason ?? "Item removal was cancelled",
                    RelatedLineItemId = lineItemId
                });
                return;
            }

            basket.LineItems.Remove(itemToRemove);
            await CalculateBasketAsync(new CalculateBasketParameters { Basket = basket, CountryCode = countryCode }, cancellationToken);
            basket.DateUpdated = DateTime.UtcNow;

            await notificationPublisher.PublishAsync(
                new BasketItemRemovedNotification(basket, itemToRemove), cancellationToken);
        }
        else
        {
            basket.Errors.Add(new()
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
    /// <strong>Tax Rates:</strong> This method resolves location-specific tax rates for each line item
    /// using <c>TaxService.GetApplicableRateAsync</c> (state-specific → country-level → TaxGroup default).
    /// The final order (created via <see cref="IInvoiceService.CreateOrderFromBasketAsync"/>)
    /// additionally supports external tax providers (Avalara, TaxJar) for street-level precision.
    /// </para>
    /// <para>
    /// With external tax providers, the preview tax amount may differ from the final order tax.
    /// This is expected behavior as external providers calculate precise tax based on:
    /// - Exact shipping address (street-level precision)
    /// - Product tax categories
    /// - Current tax rates from tax authority databases
    /// </para>
    /// </remarks>
    /// <param name="parameters">Parameters for calculating the basket</param>
    /// <param name="cancellationToken">Cancellation token</param>
    public async Task CalculateBasketAsync(CalculateBasketParameters parameters, CancellationToken cancellationToken = default)
    {
        var basket = parameters.Basket;
        var countryCode = parameters.CountryCode;

        // Resolve country code from settings if not provided
        var resolvedCountryCode = countryCode ?? _settings.DefaultShippingCountry ?? "US";
        var stateCode = basket.ShippingAddress.CountyState.RegionCode;

        // Resolve location-specific tax rates for basket line items
        if (taxService != null && !string.IsNullOrWhiteSpace(resolvedCountryCode))
        {
            await ResolveLineItemTaxRatesAsync(
                basket.LineItems, resolvedCountryCode, stateCode, cancellationToken);
        }

        // Query tax provider for shipping taxability and rate if not explicitly provided
        var isShippingTaxable = parameters.IsShippingTaxable
            ?? (taxProviderManager != null
                ? await taxProviderManager.IsShippingTaxedForLocationAsync(resolvedCountryCode, stateCode, cancellationToken)
                : false);

        // Get the shipping tax rate from the provider (respects regional overrides, global config, etc.)
        // Returns: specific rate, 0m (not taxable), or null (use proportional calculation)
        var shippingTaxRate = taxProviderManager != null
            ? await taxProviderManager.GetShippingTaxRateForLocationAsync(resolvedCountryCode, stateCode, cancellationToken)
            : null;

        basket.Errors = basket.Errors.Where(error => !error.IsShippingError).ToList();

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
            CurrencyCode = currencyCode,
            IsShippingTaxable = isShippingTaxable,
            ShippingTaxRate = shippingTaxRate
        });

        basket.SubTotal = calcResult.SubTotal;
        basket.Discount = calcResult.Discount;
        basket.AdjustedSubTotal = calcResult.AdjustedSubTotal;
        basket.Tax = calcResult.Tax;
        basket.Total = calcResult.Total;
        basket.Shipping = calcResult.Shipping;
        basket.EffectiveShippingTaxRate = calcResult.EffectiveShippingTaxRate;
    }

    /// <summary>
    /// Resolves location-specific tax rates for basket line items using TaxGroupRates.
    /// Groups items by TaxGroupId for batch efficiency, then updates each item's TaxRate.
    /// When no location-specific rate exists, GetApplicableRateAsync returns the TaxGroup default.
    /// </summary>
    private async Task ResolveLineItemTaxRatesAsync(
        List<LineItem> lineItems,
        string countryCode,
        string? stateCode,
        CancellationToken cancellationToken)
    {
        var taxableItems = lineItems
            .Where(li => li is { TaxGroupId: not null, LineItemType: LineItemType.Product or LineItemType.Custom or LineItemType.Addon })
            .ToList();

        if (taxableItems.Count == 0)
        {
            return;
        }

        // Batch by distinct TaxGroupId (typically 1-3 per basket)
        var resolvedRates = new Dictionary<Guid, decimal>();
        foreach (var taxGroupId in taxableItems.Select(li => li.TaxGroupId!.Value).Distinct())
        {
            resolvedRates[taxGroupId] = await taxService!.GetApplicableRateAsync(
                taxGroupId, countryCode, stateCode, cancellationToken);
        }

        foreach (var item in taxableItems)
        {
            if (resolvedRates.TryGetValue(item.TaxGroupId!.Value, out var rate))
            {
                item.TaxRate = rate;
                item.IsTaxable = rate > 0;
            }
        }
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
            await scope.ExecuteWithContextAsync<bool>(async db =>
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
                return true;
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

                var addonLineItem = lineItemFactory.CreateAddonForBasket(
                    product, ov.Option, ov.Value, productLineItem.Sku!, parameters.Quantity);

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
                var oldQuantity = lineItem.Quantity;

                // Publish cancelable notification before changing quantity
                var changingNotification = new BasketItemQuantityChangingNotification(basket, lineItem, oldQuantity, quantity);
                if (await notificationPublisher.PublishCancelableAsync(changingNotification, cancellationToken))
                {
                    return;
                }

                // Note: Stock validation happens at order submission time via IInventoryService.
                // The basket accepts any quantity; final validation occurs when creating the order.
                lineItem.Quantity = quantity;
                basket.DateUpdated = DateTime.UtcNow;
                await CalculateBasketAsync(new CalculateBasketParameters { Basket = basket, CountryCode = countryCode }, cancellationToken);

                using var scope = efCoreScopeProvider.CreateScope();
                await scope.ExecuteWithContextAsync<bool>(async db =>
                {
                    db.Baskets.Update(basket);
                    await db.SaveChangesAsync(cancellationToken);
                    return true;
                });
                scope.Complete();

                // Update session with modified basket
                httpContextAccessor.HttpContext?.Session.SetString("Basket", JsonSerializer.Serialize(basket, JsonOptions));

                // Track checkout activity for abandoned cart recovery (if checkout started)
                if (abandonedCheckoutService != null)
                {
                    await abandonedCheckoutService.TrackCheckoutActivityAsync(basket.Id, cancellationToken);
                }

                await notificationPublisher.PublishAsync(
                    new BasketItemQuantityChangedNotification(basket, lineItem, oldQuantity, quantity), cancellationToken);
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
            await scope.ExecuteWithContextAsync<bool>(async db =>
            {
                db.Baskets.Update(basket);
                await db.SaveChangesAsync(cancellationToken);
                return true;
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
        Basket? deletedBasket = null;

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var basketToDelete = await db.Baskets
                .FirstOrDefaultAsync(b => b.Id == basketId, cancellationToken);

            if (basketToDelete != null)
            {
                var clearingNotification = new BasketClearingNotification(basketToDelete);
                if (await notificationPublisher.PublishCancelableAsync(clearingNotification, cancellationToken))
                {
                    return false;
                }

                db.Baskets.Remove(basketToDelete);
                await db.SaveChangesAsync(cancellationToken);
                deletedBasket = basketToDelete;
            }
            return true;
        });
        scope.Complete();

        // Publish notification AFTER scope completion to avoid nested scope issues
        if (deletedBasket != null)
        {
            await notificationPublisher.PublishAsync(
                new BasketClearedNotification(deletedBasket), cancellationToken);
        }
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

    /// <inheritdoc />
    public async Task<Basket> EnsureBasketCurrencyAsync(
        EnsureBasketCurrencyParameters parameters,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(parameters.Basket.Currency) ||
            !string.Equals(parameters.Basket.Currency, parameters.CurrencyCode, StringComparison.OrdinalIgnoreCase))
        {
            parameters.Basket.Currency = parameters.CurrencyCode;
            parameters.Basket.CurrencySymbol = parameters.CurrencySymbol;
            await SaveBasketAsync(parameters.Basket, cancellationToken);
        }

        return parameters.Basket;
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

        if (!string.IsNullOrWhiteSpace(parameters.Email) &&
            !System.Net.Mail.MailAddress.TryCreate(parameters.Email, out _))
        {
            result.Messages.Add(new ResultMessage
            {
                Message = "Invalid email address format.",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

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

        // Check if addresses actually changed to avoid phantom invoice creation
        // When the same addresses are re-submitted, we don't want to invalidate existing unpaid invoices
        var addressesChanged = !AddressesEqual(basket.BillingAddress, billingAddress) ||
                               !AddressesEqual(basket.ShippingAddress, shippingAddress);

        // Capture totals before recalculation to detect if discounts/taxes changed
        var previousTotal = basket.Total;
        var previousDiscount = basket.Discount;
        var previousTax = basket.Tax;

        // Update basket addresses
        basket.BillingAddress = billingAddress;
        basket.ShippingAddress = shippingAddress;

        // Recalculate with the new shipping address country
        await CalculateBasketAsync(new CalculateBasketParameters
        {
            Basket = basket,
            CountryCode = shippingAddress.CountryCode
        }, cancellationToken);

        // Apply automatic discounts (e.g., "Free shipping in UK", "10% off orders over £100")
        if (checkoutDiscountService != null)
        {
            basket = await checkoutDiscountService.Value.RefreshAutomaticDiscountsAsync(basket, shippingAddress.CountryCode, cancellationToken);
        }

        // Update timestamp if addresses changed OR if totals changed after recalculation
        // This ensures invoice dedup creates a new invoice when discounts/taxes change
        var totalsChanged = basket.Total != previousTotal ||
                            basket.Discount != previousDiscount ||
                            basket.Tax != previousTax;

        if (addressesChanged || totalsChanged)
        {
            basket.DateUpdated = DateTime.UtcNow;
        }

        // Save to database
        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            db.Baskets.Update(basket);
            await db.SaveChangesAsync(cancellationToken);
            return true;
        });
        scope.Complete();

        // Update HTTP session
        httpContextAccessor.HttpContext?.Session.SetString("Basket", JsonSerializer.Serialize(basket, JsonOptions));

        // Update checkout session
        await checkoutSessionService.SaveAddressesAsync(new SaveSessionAddressesParameters
        {
            BasketId = basket.Id,
            Billing = billingAddress,
            Shipping = shippingAddress,
            SameAsBilling = parameters.ShippingSameAsBilling,
            AcceptsMarketing = parameters.AcceptsMarketing
        }, cancellationToken);

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
                    var customer = await customerService.GetOrCreateByEmailAsync(new GetOrCreateCustomerParameters
                    {
                        Email = parameters.Email
                    }, cancellationToken);
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
        // Update concurrency stamp before saving
        basket.ConcurrencyStamp = Guid.NewGuid().ToString();

        using var scope = efCoreScopeProvider.CreateScope();
        try
        {
            await scope.ExecuteWithContextAsync<bool>(async db =>
            {
                var exists = await db.Baskets.AnyAsync(b => b.Id == basket.Id, cancellationToken);
                if (exists)
                {
                    db.Baskets.Update(basket);
                }
                else
                {
                    db.Baskets.Add(basket);
                }
                await db.SaveChangesAsync(cancellationToken);
                return true;
            });
            scope.Complete();
        }
        catch (DbUpdateConcurrencyException ex)
        {
            logger.LogWarning(ex, "Basket {BasketId} was modified concurrently. Reloading and retrying.", basket.Id);

            // Retry once with fresh data
            using var retryScope = efCoreScopeProvider.CreateScope();
            await retryScope.ExecuteWithContextAsync<bool>(async db =>
            {
                var freshBasket = await db.Baskets.FirstOrDefaultAsync(b => b.Id == basket.Id, cancellationToken);
                if (freshBasket != null)
                {
                    // Apply current values to the fresh entity
                    db.Entry(freshBasket).CurrentValues.SetValues(basket);
                    freshBasket.ConcurrencyStamp = Guid.NewGuid().ToString();
                    await db.SaveChangesAsync(cancellationToken);
                    basket.ConcurrencyStamp = freshBasket.ConcurrencyStamp;
                }
                else
                {
                    db.Baskets.Add(basket);
                    await db.SaveChangesAsync(cancellationToken);
                }
                return true;
            });
            retryScope.Complete();
        }

        // Update HTTP session to keep in sync
        httpContextAccessor.HttpContext?.Session.SetString("Basket", JsonSerializer.Serialize(basket, JsonOptions));
    }

    /// <inheritdoc />
    public async Task<bool> CaptureAddressAsync(
        CaptureAddressParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var basket = parameters.Basket;
        var hasChanges = false;

        // Update email if provided
        if (!string.IsNullOrWhiteSpace(parameters.Email))
        {
            basket.BillingAddress.Email = parameters.Email.Trim();
            hasChanges = true;
        }

        // Update billing address fields
        if (parameters.BillingAddress != null)
        {
            UpdateAddressFromDto(basket.BillingAddress, parameters.BillingAddress);
            hasChanges = true;
        }

        // Update shipping address
        if (parameters.ShippingSameAsBilling && parameters.BillingAddress != null)
        {
            CopyAddress(basket.BillingAddress, basket.ShippingAddress);
        }
        else if (!parameters.ShippingSameAsBilling && parameters.ShippingAddress != null)
        {
            UpdateAddressFromDto(basket.ShippingAddress, parameters.ShippingAddress);
            hasChanges = true;
        }

        if (hasChanges)
        {
            await SaveBasketAsync(basket, cancellationToken);

            await checkoutSessionService.SaveAddressesAsync(new SaveSessionAddressesParameters
            {
                BasketId = basket.Id,
                Billing = basket.BillingAddress,
                Shipping = basket.ShippingAddress,
                SameAsBilling = parameters.ShippingSameAsBilling
            }, cancellationToken);

            if (abandonedCheckoutService != null)
            {
                await abandonedCheckoutService.TrackCheckoutActivityAsync(
                    basket,
                    basket.BillingAddress.Email ?? "",
                    cancellationToken);
            }
        }

        return hasChanges;
    }

    private static void UpdateAddressFromDto(Locality.Models.Address address, CheckoutAddressDto dto)
    {
        if (!string.IsNullOrEmpty(dto.Name)) address.Name = dto.Name;
        if (!string.IsNullOrEmpty(dto.Company)) address.Company = dto.Company;
        if (!string.IsNullOrEmpty(dto.Address1)) address.AddressOne = dto.Address1;
        if (dto.Address2 != null) address.AddressTwo = dto.Address2;
        if (!string.IsNullOrEmpty(dto.City)) address.TownCity = dto.City;
        if (!string.IsNullOrEmpty(dto.PostalCode)) address.PostalCode = dto.PostalCode;
        if (!string.IsNullOrEmpty(dto.Country)) address.Country = dto.Country;
        if (!string.IsNullOrEmpty(dto.CountryCode)) address.CountryCode = dto.CountryCode;
        if (!string.IsNullOrEmpty(dto.Phone)) address.Phone = dto.Phone;

        if (!string.IsNullOrEmpty(dto.State) || !string.IsNullOrEmpty(dto.StateCode))
        {
            address.CountyState ??= new Locality.Models.CountyState();
            if (!string.IsNullOrEmpty(dto.State)) address.CountyState.Name = dto.State;
            if (!string.IsNullOrEmpty(dto.StateCode)) address.CountyState.RegionCode = dto.StateCode;
        }
    }

    private static void CopyAddress(Locality.Models.Address source, Locality.Models.Address target)
    {
        target.Name = source.Name;
        target.Company = source.Company;
        target.AddressOne = source.AddressOne;
        target.AddressTwo = source.AddressTwo;
        target.TownCity = source.TownCity;
        target.PostalCode = source.PostalCode;
        target.Country = source.Country;
        target.CountryCode = source.CountryCode;
        target.Phone = source.Phone;
        target.Email = source.Email;

        if (source.CountyState != null)
        {
            target.CountyState ??= new Locality.Models.CountyState();
            target.CountyState.Name = source.CountyState.Name;
            target.CountyState.RegionCode = source.CountyState.RegionCode;
        }
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
        var changingNotification = new ShippingSelectionChangingNotification(basket, new Dictionary<Guid, string>(selections));

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

        // Check if shipping selections actually changed to avoid phantom invoice creation
        // When the same selections are re-submitted, we don't want to invalidate existing unpaid invoices
        var selectionsChanged = !ShippingSelectionsEqual(session.SelectedShippingOptions, selections);

        // Capture totals before recalculation to detect if discounts/taxes changed
        var previousTotal = basket.Total;
        var previousDiscount = basket.Discount;
        var previousTax = basket.Tax;
        var previousShipping = basket.Shipping;

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

        // Calculate total shipping cost from selected options and store quoted costs
        decimal totalShipping = 0;
        var quotedCosts = parameters.QuotedCosts ?? [];
        foreach (var group in groupingResult.Groups)
        {
            if (!string.IsNullOrEmpty(group.SelectedShippingOptionId))
            {
                var selectedOption = group.AvailableShippingOptions
                    .FirstOrDefault(o => o.SelectionKey == group.SelectedShippingOptionId);

                if (selectedOption != null)
                {
                    var costToCharge = selectedOption.Cost;
                    if (quotedCosts.TryGetValue(group.GroupId, out var customerQuoted) && customerQuoted > 0)
                    {
                        // Only honor quoted cost if within reasonable bounds of the live rate.
                        // Prevents frontend tampering while protecting customers from rate increases.
                        var floor = selectedOption.Cost * 0.8m;
                        if (customerQuoted >= floor)
                        {
                            // Take the lower of quoted vs live: customer never pays more than
                            // quoted, but also benefits from any rate decrease.
                            costToCharge = Math.Min(selectedOption.Cost, customerQuoted);
                        }

                        var smallestUnit = 1m / (decimal)Math.Pow(10, currencyService.GetDecimalPlaces(basket.Currency ?? _settings.StoreCurrencyCode));
                        if (Math.Abs(selectedOption.Cost - costToCharge) > smallestUnit)
                        {
                            logger.LogWarning(
                                "Shipping rate adjusted for group {GroupId}: quoted {QuotedCost}, live {LiveCost}, charged {ChargedCost}",
                                group.GroupId, customerQuoted, selectedOption.Cost, costToCharge);
                        }
                    }

                    totalShipping += costToCharge;
                    session.QuotedShippingCosts[group.GroupId] = new QuotedShippingCost(costToCharge, DateTime.UtcNow);
                }
                else if (quotedCosts.TryGetValue(group.GroupId, out var quotedCost))
                {
                    // Fallback to quoted cost from parameters (for dynamic provider selections)
                    totalShipping += quotedCost;
                    session.QuotedShippingCosts[group.GroupId] = new QuotedShippingCost(quotedCost, DateTime.UtcNow);
                }
            }
        }

        // Recalculate totals with the selected shipping amount
        await CalculateBasketAsync(new CalculateBasketParameters
        {
            Basket = basket,
            CountryCode = session.ShippingAddress.CountryCode,
            ShippingAmountOverride = totalShipping
        }, cancellationToken);

        // Refresh automatic discounts (shipping costs may affect free shipping thresholds)
        if (checkoutDiscountService != null)
        {
            basket = await checkoutDiscountService.Value.RefreshAutomaticDiscountsAsync(
                basket,
                session.ShippingAddress.CountryCode,
                cancellationToken);
        }

        // Update timestamp if selections changed OR if totals changed after recalculation
        // This ensures invoice dedup creates a new invoice when shipping/discounts/taxes change
        var totalsChanged = basket.Total != previousTotal ||
                            basket.Discount != previousDiscount ||
                            basket.Tax != previousTax ||
                            basket.Shipping != previousShipping;

        if (selectionsChanged || totalsChanged)
        {
            basket.DateUpdated = DateTime.UtcNow;
        }

        // Save basket to database
        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            db.Baskets.Update(basket);
            await db.SaveChangesAsync(cancellationToken);
            return true;
        });
        scope.Complete();

        // Update HTTP session
        httpContextAccessor.HttpContext?.Session.SetString("Basket", JsonSerializer.Serialize(basket, JsonOptions));

        // Persist shipping selections and quoted costs to checkout session
        await checkoutSessionService.SaveShippingSelectionsAsync(new SaveSessionShippingSelectionsParameters
        {
            BasketId = basket.Id,
            Selections = selections,
            DeliveryDates = deliveryDates,
            QuotedCosts = session.QuotedShippingCosts
        }, cancellationToken);

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
                        // Tax info for tax-inclusive display
                        TaxRate = li.TaxRate,
                        IsTaxable = li.IsTaxable,
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

            // Tax-inclusive display support - read from ExtendedData
            EffectiveShippingTaxRate = invoice.ExtendedData.TryGetValue(
                Constants.ExtendedDataKeys.EffectiveShippingTaxRate, out var rateValue)
                ? rateValue switch
                {
                    JsonElement je => je.GetDecimal(),
                    decimal d => d,
                    _ => Convert.ToDecimal(rateValue)
                }
                : null,

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

        // Determine shipping selections: restore previous selections if valid, otherwise auto-select
        var finalSelections = new Dictionary<Guid, string>();
        decimal combinedShippingTotal = 0;
        var shippingAutoSelected = false;

        if (groupingResult.Groups.Count > 0)
        {
            // First, try to validate and restore previous selections from frontend
            var validPreviousSelections = ShippingAutoSelector.ValidatePreviousSelections(
                groupingResult.Groups,
                parameters.PreviousShippingSelections);

            // Start with valid previous selections
            foreach (var selection in validPreviousSelections)
            {
                finalSelections[selection.Key] = selection.Value;
            }

            // For groups without a valid previous selection, auto-select using configured strategy
            if (parameters.AutoSelectShipping)
            {
                var groupsNeedingAutoSelect = groupingResult.Groups
                    .Where(g => !finalSelections.ContainsKey(g.GroupId))
                    .ToList();

                if (groupsNeedingAutoSelect.Count > 0)
                {
                    var strategy = ParseAutoSelectStrategy(_settings.ShippingAutoSelectStrategy);

                    var autoSelectedOptions = ShippingAutoSelector.SelectOptions(
                        groupsNeedingAutoSelect,
                        strategy);

                    foreach (var selection in autoSelectedOptions)
                    {
                        finalSelections[selection.Key] = selection.Value;
                    }

                    // Only mark as auto-selected if we actually auto-selected (not restored)
                    shippingAutoSelected = autoSelectedOptions.Count > 0 && validPreviousSelections.Count == 0;
                }
            }

            // Apply all selections to groups
            ShippingAutoSelector.ApplySelectionsToGroups(groupingResult.Groups, finalSelections);

            // Calculate combined shipping total from final selections
            combinedShippingTotal = ShippingAutoSelector.CalculateCombinedTotal(
                groupingResult.Groups,
                finalSelections);

            // Recalculate totals with the selected shipping amount
            await CalculateBasketAsync(new CalculateBasketParameters
            {
                Basket = basket,
                CountryCode = parameters.CountryCode,
                ShippingAmountOverride = combinedShippingTotal
            }, cancellationToken);

            // Save selections to session
            await checkoutSessionService.SaveShippingSelectionsAsync(new SaveSessionShippingSelectionsParameters
            {
                BasketId = basket.Id,
                Selections = finalSelections
            }, cancellationToken);
        }

        // Refresh automatic discounts (may include free shipping based on threshold)
        if (checkoutDiscountService != null)
        {
            basket = await checkoutDiscountService.Value.RefreshAutomaticDiscountsAsync(basket, parameters.CountryCode, cancellationToken);
        }

        // Save basket to database
        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            db.Baskets.Update(basket);
            await db.SaveChangesAsync(cancellationToken);
            return true;
        });
        scope.Complete();

        // Update HTTP session
        httpContextAccessor.HttpContext?.Session.SetString("Basket", JsonSerializer.Serialize(basket, JsonOptions));

        // Update checkout session with shipping address
        await checkoutSessionService.SaveAddressesAsync(new SaveSessionAddressesParameters
        {
            BasketId = basket.Id,
            Billing = shippingAddress,
            Shipping = shippingAddress,
            SameAsBilling = true
        }, cancellationToken);

        result.ResultObject = new InitializeCheckoutResult
        {
            Basket = basket,
            GroupingResult = groupingResult,
            AutoSelectedShippingOptions = finalSelections,
            CombinedShippingTotal = combinedShippingTotal,
            ShippingAutoSelected = shippingAutoSelected
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
    /// Compares two addresses for equality.
    /// Used to detect if addresses have actually changed to avoid unnecessary basket timestamp updates.
    /// </summary>
    private static bool AddressesEqual(Address? a, Address? b)
    {
        if (a == null && b == null)
        {
            return true;
        }

        if (a == null || b == null)
        {
            return false;
        }

        return string.Equals(a.Name, b.Name, StringComparison.Ordinal) &&
               string.Equals(a.Company, b.Company, StringComparison.Ordinal) &&
               string.Equals(a.AddressOne, b.AddressOne, StringComparison.Ordinal) &&
               string.Equals(a.AddressTwo, b.AddressTwo, StringComparison.Ordinal) &&
               string.Equals(a.TownCity, b.TownCity, StringComparison.Ordinal) &&
               string.Equals(a.CountyState.RegionCode, b.CountyState.RegionCode, StringComparison.OrdinalIgnoreCase) &&
               string.Equals(a.PostalCode, b.PostalCode, StringComparison.OrdinalIgnoreCase) &&
               string.Equals(a.CountryCode, b.CountryCode, StringComparison.OrdinalIgnoreCase) &&
               string.Equals(a.Phone, b.Phone, StringComparison.Ordinal) &&
               string.Equals(a.Email, b.Email, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Compares two shipping selection dictionaries for equality.
    /// Used to detect if shipping selections have actually changed to avoid unnecessary basket timestamp updates.
    /// </summary>
    private static bool ShippingSelectionsEqual(
        IReadOnlyDictionary<Guid, string>? existing,
        IReadOnlyDictionary<Guid, string>? newSelections)
    {
        if (existing == null && newSelections == null)
        {
            return true;
        }

        if (existing == null || newSelections == null)
        {
            return false;
        }

        if (existing.Count != newSelections.Count)
        {
            return false;
        }

        foreach (var kvp in existing)
        {
            if (!newSelections.TryGetValue(kvp.Key, out var newValue) || newValue != kvp.Value)
            {
                return false;
            }
        }

        return true;
    }

    /// <inheritdoc />
    public async Task<bool> BasketHasDigitalProductsAsync(Basket basket, CancellationToken cancellationToken = default)
    {
        foreach (var lineItem in basket.LineItems.Where(li => li.ProductId.HasValue))
        {
            var product = await productService.GetProductRoot(lineItem.ProductId!.Value, cancellationToken: cancellationToken);
            if (product is { IsDigitalProduct: true })
            {
                return true;
            }
        }

        return false;
    }

    /// <inheritdoc />
    public async Task<CheckoutSessionState?> GetSessionStateAsync(
        Guid basketId,
        CancellationToken cancellationToken = default)
    {
        // Load basket directly from database
        using var scope = efCoreScopeProvider.CreateScope();
        var basket = await scope.ExecuteWithContextAsync(async db =>
            await db.Baskets.FirstOrDefaultAsync(b => b.Id == basketId, cancellationToken));

        if (basket == null)
        {
            return null;
        }

        // Load checkout session
        var session = await checkoutSessionService.GetSessionAsync(basketId, cancellationToken);

        // Calculate order groups for fulfillment
        OrderGroupingResult? orderGroups = null;
        if (!string.IsNullOrEmpty(basket.ShippingAddress.CountryCode))
        {
            orderGroups = await GetOrderGroupsAsync(basket, session, cancellationToken);

            // Propagate grouping errors (e.g., warehouse cannot serve region) to basket for protocol message mapping
            foreach (var error in orderGroups.Errors)
            {
                if (!basket.Errors.Any(e => e.Message == error))
                {
                    basket.Errors.Add(new BasketError
                    {
                        Message = error,
                        IsShippingError = true
                    });
                }
            }
        }

        // Determine session status
        var status = DetermineSessionStatus(basket, session, orderGroups);

        // Build messages from basket errors
        var messages = MapProtocolMessages(basket);

        // Map to protocol state
        return new CheckoutSessionState
        {
            SessionId = basketId.ToString(),
            Status = status,
            CreatedAt = basket.DateCreated,
            UpdatedAt = basket.DateUpdated,
            ExpiresAt = session.CreatedAt.AddHours(24),
            Currency = basket.Currency ?? _settings.StoreCurrencyCode,
            LineItems = MapLineItems(basket),
            BillingAddress = MapAddress(basket.BillingAddress),
            ShippingAddress = MapAddress(basket.ShippingAddress),
            ShippingSameAsBilling = session.ShippingSameAsBilling,
            Discounts = MapDiscounts(basket),
            Fulfillment = MapFulfillment(orderGroups, session, basket.Currency ?? _settings.StoreCurrencyCode),
            Totals = MapTotals(basket),
            Messages = messages,
            ContinueUrl = status == ProtocolConstants.SessionStatus.RequiresEscalation
                ? $"/checkout/{basketId}"
                : null,
            BuyerEmail = basket.BillingAddress.Email ?? basket.ShippingAddress.Email
        };
    }

    private static string DetermineSessionStatus(Basket basket, CheckoutSession session, OrderGroupingResult? orderGroups)
    {
        // Check for errors
        if (basket.Errors.Count > 0)
        {
            return ProtocolConstants.SessionStatus.Incomplete;
        }

        // Check if line items exist
        if (basket.LineItems.Count == 0)
        {
            return ProtocolConstants.SessionStatus.Incomplete;
        }

        // Check billing address
        if (string.IsNullOrEmpty(basket.BillingAddress.Email) ||
            string.IsNullOrEmpty(basket.BillingAddress.CountryCode))
        {
            return ProtocolConstants.SessionStatus.Incomplete;
        }

        // Check shipping address for physical products
        var hasPhysicalProducts = basket.LineItems.Any(li =>
            li.LineItemType == LineItemType.Product && !IsDigitalProduct(li));

        if (hasPhysicalProducts)
        {
            if (string.IsNullOrEmpty(basket.ShippingAddress.CountryCode))
            {
                return ProtocolConstants.SessionStatus.Incomplete;
            }

            // Check shipping selections
            if (orderGroups?.Groups.Count > 0)
            {
                var allGroupsHaveSelection = orderGroups.Groups
                    .All(g => !string.IsNullOrEmpty(g.SelectedShippingOptionId) ||
                              session.SelectedShippingOptions.ContainsKey(g.GroupId));

                if (!allGroupsHaveSelection)
                {
                    return ProtocolConstants.SessionStatus.Incomplete;
                }
            }
        }

        // All required info collected
        return ProtocolConstants.SessionStatus.ReadyForComplete;
    }

    private static bool IsDigitalProduct(LineItem li)
    {
        return li.ExtendedData.TryGetValue("IsDigital", out var isDigital) && isDigital is true;
    }

    private static ShippingAutoSelectStrategy ParseAutoSelectStrategy(string? value) => value switch
    {
        "fastest" => ShippingAutoSelectStrategy.Fastest,
        "cheapest-then-fastest" => ShippingAutoSelectStrategy.CheapestThenFastest,
        _ => ShippingAutoSelectStrategy.Cheapest
    };

    private static IReadOnlyList<CheckoutLineItemState> MapLineItems(Basket basket)
    {
        return basket.LineItems
            .Where(li => li.LineItemType == LineItemType.Product)
            .Select(li => new CheckoutLineItemState
            {
                LineItemId = li.Id.ToString(),
                ProductId = li.ProductId?.ToString(),
                VariantId = li.ExtendedData.TryGetValue("VariantId", out var vid) ? vid?.ToString() : null,
                Sku = li.Sku ?? string.Empty,
                Name = li.Name ?? string.Empty,
                Description = li.ExtendedData.TryGetValue("Description", out var desc) ? desc?.ToString() : null,
                Quantity = li.Quantity,
                UnitPrice = ToMinorUnits(li.Amount),
                LineTotal = ToMinorUnits(li.Amount * li.Quantity),
                DiscountAmount = 0, // Line-level discounts would need additional calculation
                TaxAmount = li.IsTaxable ? ToMinorUnits(li.Amount * li.Quantity * li.TaxRate / 100) : 0,
                FinalTotal = ToMinorUnits(li.Amount * li.Quantity),
                RequiresShipping = !li.ExtendedData.TryGetValue("IsDigital", out var isDigital) || isDigital is not true,
                ImageUrl = li.ExtendedData.TryGetValue("ImageUrl", out var img) ? img?.ToString() : null,
                ProductUrl = li.ExtendedData.TryGetValue("ProductUrl", out var url) ? url?.ToString() : null,
                SelectedOptions = MapLineItemOptions(li)
            })
            .ToList();
    }

    private static IReadOnlyList<CheckoutLineItemOption>? MapLineItemOptions(LineItem li)
    {
        if (!li.ExtendedData.TryGetValue("SelectedOptions", out var optionsObj) || optionsObj is not IEnumerable<object> options)
        {
            return null;
        }

        var result = new List<CheckoutLineItemOption>();
        foreach (var opt in options)
        {
            if (opt is IDictionary<string, object> dict &&
                dict.TryGetValue("Name", out var name) &&
                dict.TryGetValue("Value", out var value))
            {
                result.Add(new CheckoutLineItemOption
                {
                    Name = name?.ToString() ?? string.Empty,
                    Value = value?.ToString() ?? string.Empty
                });
            }
        }

        return result.Count > 0 ? result : null;
    }

    private static CheckoutAddressState? MapAddress(Address address)
    {
        if (string.IsNullOrEmpty(address.CountryCode) && string.IsNullOrEmpty(address.Email))
        {
            return null;
        }

        // Split name into first/last if possible
        var nameParts = (address.Name ?? string.Empty).Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);

        return new CheckoutAddressState
        {
            FirstName = nameParts.Length > 0 ? nameParts[0] : null,
            LastName = nameParts.Length > 1 ? nameParts[1] : null,
            Company = address.Company,
            Address1 = address.AddressOne,
            Address2 = address.AddressTwo,
            City = address.TownCity,
            Region = address.CountyState.Name,
            RegionCode = address.CountyState.RegionCode,
            PostalCode = address.PostalCode,
            Country = address.Country,
            CountryCode = address.CountryCode,
            Phone = address.Phone,
            Email = address.Email
        };
    }

    private static IReadOnlyList<CheckoutDiscountState> MapDiscounts(Basket basket)
    {
        return basket.LineItems
            .Where(li => li.LineItemType == LineItemType.Discount)
            .Select(li => new CheckoutDiscountState
            {
                DiscountId = li.Id.ToString(),
                Code = li.ExtendedData.TryGetValue("DiscountCode", out var code) ? code?.ToString() : null,
                Name = li.Name ?? "Discount",
                Type = li.ExtendedData.TryGetValue("DiscountType", out var type)
                    ? MapDiscountType(type?.ToString())
                    : ProtocolConstants.DiscountTypes.FixedAmount,
                Amount = ToMinorUnits(Math.Abs(li.Amount * li.Quantity)),
                IsAutomatic = li.ExtendedData.TryGetValue("IsAutomatic", out var auto) && auto is true,
                Method = ProtocolConstants.DiscountAllocationMethods.Across
            })
            .ToList();
    }

    private static string MapDiscountType(string? type) => type?.ToLowerInvariant() switch
    {
        "percentage" => ProtocolConstants.DiscountTypes.Percentage,
        "freeshipping" or "free_shipping" => ProtocolConstants.DiscountTypes.FreeShipping,
        "buyxgety" or "buy_x_get_y" => ProtocolConstants.DiscountTypes.BuyXGetY,
        _ => ProtocolConstants.DiscountTypes.FixedAmount
    };

    private static CheckoutFulfillmentState? MapFulfillment(
        OrderGroupingResult? orderGroups,
        CheckoutSession? session,
        string currency)
    {
        if (orderGroups?.Groups == null || orderGroups.Groups.Count == 0)
        {
            return null;
        }

        var allLineItemIds = orderGroups.Groups
            .SelectMany(g => g.LineItems.Select(li => li.LineItemId.ToString()))
            .Distinct()
            .ToList();

        return new CheckoutFulfillmentState
        {
            Methods =
            [
                new FulfillmentMethodState
                {
                    Type = ProtocolConstants.FulfillmentTypes.Shipping,
                    LineItemIds = allLineItemIds,
                    Groups = orderGroups.Groups.Select(g => new FulfillmentGroupState
                    {
                        GroupId = g.GroupId.ToString(),
                        GroupName = g.GroupName,
                        LineItemIds = g.LineItems.Select(li => li.LineItemId.ToString()).ToList(),
                        SelectedOptionId = g.SelectedShippingOptionId?.ToString()
                            ?? (session?.SelectedShippingOptions.TryGetValue(g.GroupId, out var selId) == true
                                ? selId.ToString()
                                : null),
                        Options = g.AvailableShippingOptions.Select(opt => new FulfillmentOptionState
                        {
                            OptionId = opt.ShippingOptionId.ToString(),
                            Title = opt.Name,
                            Description = opt.DeliveryTimeDescription,
                            Amount = ToMinorUnits(opt.Cost),
                            Currency = currency,
                            EstimatedDeliveryDays = opt.DaysTo > 0 ? opt.DaysTo : null
                        }).ToList()
                    }).ToList()
                }
            ]
        };
    }

    private static CheckoutTotalsState MapTotals(Basket basket)
    {
        var currency = basket.Currency ?? "USD";

        var breakdown = new List<CheckoutTotalBreakdown>
        {
            new() { Label = "Subtotal", Amount = ToMinorUnits(basket.SubTotal), Type = "subtotal" }
        };

        if (basket.Discount > 0)
        {
            breakdown.Add(new CheckoutTotalBreakdown { Label = "Discount", Amount = -ToMinorUnits(basket.Discount), Type = "discount" });
        }

        if (basket.Shipping > 0)
        {
            breakdown.Add(new CheckoutTotalBreakdown { Label = "Shipping", Amount = ToMinorUnits(basket.Shipping), Type = "fulfillment" });
        }

        if (basket.Tax > 0)
        {
            breakdown.Add(new CheckoutTotalBreakdown { Label = "Tax", Amount = ToMinorUnits(basket.Tax), Type = "tax" });
        }

        breakdown.Add(new CheckoutTotalBreakdown { Label = "Total", Amount = ToMinorUnits(basket.Total), Type = "total" });

        return new CheckoutTotalsState
        {
            Subtotal = ToMinorUnits(basket.SubTotal),
            ItemsDiscount = 0,
            Discount = ToMinorUnits(basket.Discount),
            Fulfillment = ToMinorUnits(basket.Shipping),
            Tax = ToMinorUnits(basket.Tax),
            Total = ToMinorUnits(basket.Total),
            Currency = currency,
            Breakdown = breakdown
        };
    }

    private static IReadOnlyList<CheckoutMessageState> MapProtocolMessages(Basket basket)
    {
        return basket.Errors
            .Select(e => new CheckoutMessageState
            {
                Type = ProtocolConstants.MessageTypes.Error,
                Code = e.IsShippingError
                    ? ProtocolConstants.MessageCodes.ShippingUnavailable
                    : (e.RelatedLineItemId.HasValue
                        ? ProtocolConstants.MessageCodes.OutOfStock
                        : ProtocolConstants.MessageCodes.Missing),
                Path = e.RelatedLineItemId.HasValue
                    ? $"$.line_items[?(@.id=='{e.RelatedLineItemId}')]"
                    : (e.IsShippingError ? "$.fulfillment" : null),
                Content = e.Message ?? "An error occurred",
                Severity = ProtocolConstants.MessageSeverity.RequiresBuyerInput
            })
            .ToList();
    }

    /// <inheritdoc />
    public async Task<Basket?> GetBasketByIdAsync(
        Guid basketId,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        return await scope.ExecuteWithContextAsync(async db =>
            await db.Baskets.FirstOrDefaultAsync(b => b.Id == basketId, cancellationToken));
    }

    /// <inheritdoc />
    public async Task<GetEstimatedShippingResult> GetEstimatedShippingAsync(
        GetEstimatedShippingParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var basket = parameters.Basket;

        if (basket.LineItems.Count == 0)
        {
            return GetEstimatedShippingResult.Fail("Basket is empty");
        }

        // Create minimal checkout session with shipping address
        var session = new CheckoutSession
        {
            BasketId = basket.Id,
            ShippingAddress = new Address
            {
                CountryCode = parameters.CountryCode,
                CountyState = new CountyState
                {
                    RegionCode = parameters.RegionCode
                }
            }
        };

        // Get order groups with shipping options
        var groupingResult = await GetOrderGroupsAsync(basket, session, cancellationToken);
        if (!groupingResult.Success || groupingResult.Groups.Count == 0)
        {
            return GetEstimatedShippingResult.Fail(
                groupingResult.Errors.FirstOrDefault() ?? "Unable to calculate shipping");
        }

        // Auto-select cheapest option for each group
        var selections = ShippingAutoSelector.SelectOptions(groupingResult.Groups, ShippingAutoSelectStrategy.Cheapest);
        var estimatedShipping = ShippingAutoSelector.CalculateCombinedTotal(groupingResult.Groups, selections);

        // Update basket with estimated shipping so basket.Total is consistent
        await CalculateBasketAsync(new CalculateBasketParameters
        {
            Basket = basket,
            CountryCode = parameters.CountryCode,
            ShippingAmountOverride = estimatedShipping
        }, cancellationToken);

        return GetEstimatedShippingResult.Ok(estimatedShipping, groupingResult.Groups.Count);
    }

    /// <summary>
    /// Converts a decimal amount to minor units (cents).
    /// UCP requires all monetary amounts in minor units.
    /// </summary>
    private static long ToMinorUnits(decimal amount) => (long)Math.Round(amount * 100);

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
