using System.Text.Json;
using Merchello.Core.Accounting.Extensions;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Checkout.Extensions;
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
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Warehouses.Services.Interfaces;
using Merchello.Core.Warehouses.Services.Parameters;
using Merchello.Core.Warehouses.Models;
using Merchello.Core.Locality.Dtos;
using Merchello.Core.Locality.Models;
using Merchello.Core.Locality.Factories;
using Merchello.Core.Locality.Services.Interfaces;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.Customers.Services.Parameters;
using Merchello.Core.Tax.Providers.Interfaces;
using Merchello.Core.Tax.Providers.Models;
using Merchello.Core.Tax.Services.Interfaces;
using Merchello.Core.Tax.Services.Models;
using Merchello.Core.Storefront.Services.Interfaces;
using Merchello.Core.Protocols;
using Merchello.Core.Protocols.Models;
using Merchello.Core.Shared.Providers;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
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
    AddressFactory addressFactory,
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
    ITaxOrchestrationService? taxOrchestrationService = null,
    Lazy<ICheckoutDiscountService>? checkoutDiscountService = null,
    ICountryCurrencyMappingService? countryCurrencyMappingService = null) : ICheckoutService
{
    private readonly ILocationsService _locationsService = locationsService ?? new NoopLocationsService();
    private readonly MerchelloSettings _settings = settings.Value;

    private const string BasketCacheKey = "merchello:Basket";

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

        if (checkoutDiscountService != null)
        {
            await checkoutDiscountService.Value.RefreshPromotionalDiscountsAsync(
                basket,
                countryCode,
                cancellationToken);
        }

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

            if (checkoutDiscountService != null)
            {
                await checkoutDiscountService.Value.RefreshPromotionalDiscountsAsync(
                    basket,
                    countryCode,
                    cancellationToken);
            }

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
        basket.IsTaxEstimated = false;
        basket.TaxEstimationReason = null;

        // Resolve location-specific tax rates for basket line items
        if (taxService != null && !string.IsNullOrWhiteSpace(resolvedCountryCode))
        {
            await ResolveLineItemTaxRatesAsync(
                basket.LineItems, resolvedCountryCode, stateCode, cancellationToken);
        }

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

        var currencyCode = _settings.StoreCurrencyCode;

        var providerCountryCode = countryCode ?? basket.ShippingAddress.CountryCode;
        var taxShippingAddress = BuildTaxAddressForBasket(basket, providerCountryCode, stateCode);
        var taxableLineItems = BuildTaxableLineItemsForCalculation(basket.LineItems);

        var orchestrationResult = taxOrchestrationService != null
            ? await taxOrchestrationService.CalculateAsync(
                new TaxOrchestrationRequest
                {
                    ShippingAddress = taxShippingAddress,
                    BillingAddress = basket.BillingAddress,
                    CurrencyCode = currencyCode,
                    LineItems = taxableLineItems,
                    ShippingAmount = shippingCost,
                    CustomerId = basket.CustomerId,
                    CustomerEmail = basket.BillingAddress.Email,
                    IsTaxExempt = false,
                    TransactionDate = DateTime.UtcNow,
                    AllowEstimate = true
                },
                cancellationToken)
            : TaxOrchestrationResult.Centralized();

        if (!orchestrationResult.Success)
        {
            orchestrationResult = TaxOrchestrationResult.Centralized(
                isEstimated: true,
                estimationReason: "ProviderUnavailable",
                warnings: [orchestrationResult.ErrorMessage ?? "Tax provider unavailable. Using estimated tax."]);
        }

        if (!orchestrationResult.UseCentralizedCalculation && orchestrationResult.ProviderResult != null)
        {
            ApplyProviderLineResultsToLineItems(basket.LineItems, orchestrationResult.ProviderResult.LineResults);

            // Keep centralized discount/subtotal logic, but tax total is provider-authoritative.
            var baseResult = lineItemService.CalculateFromLineItems(new CalculateLineItemsParameters
            {
                LineItems = basket.LineItems,
                ShippingAmount = shippingCost,
                CurrencyCode = currencyCode,
                IsShippingTaxable = false,
                ShippingTaxRate = 0m
            });

            basket.SubTotal = baseResult.SubTotal;
            basket.Discount = baseResult.Discount;
            basket.AdjustedSubTotal = baseResult.AdjustedSubTotal;
            basket.Tax = currencyService.Round(orchestrationResult.ProviderResult.TotalTax, currencyCode);
            basket.Shipping = shippingCost;
            basket.Total = currencyService.Round(
                basket.AdjustedSubTotal + basket.Tax + basket.Shipping,
                currencyCode);
            basket.EffectiveShippingTaxRate = shippingCost > 0
                ? Math.Round((orchestrationResult.ProviderResult.ShippingTax / shippingCost) * 100m, 4)
                : null;
            basket.IsTaxEstimated = orchestrationResult.ProviderResult.IsEstimated;
            basket.TaxEstimationReason = orchestrationResult.ProviderResult.IsEstimated
                ? orchestrationResult.ProviderResult.EstimationReason
                : null;
            return;
        }

        var shippingTaxConfiguration = await ResolveShippingTaxConfigurationAsync(
            resolvedCountryCode,
            stateCode,
            cancellationToken);

        var isShippingTaxable = parameters.IsShippingTaxable
            ?? shippingTaxConfiguration.Mode != ShippingTaxMode.NotTaxed;

        var shippingTaxRate = shippingTaxConfiguration.Mode == ShippingTaxMode.FixedRate
            ? shippingTaxConfiguration.Rate
            : null;

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
        basket.IsTaxEstimated = orchestrationResult.IsEstimated;
        basket.TaxEstimationReason = orchestrationResult.IsEstimated
            ? orchestrationResult.EstimationReason
            : null;
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
                item.IsTaxable = item.TaxGroupId.HasValue;
            }
        }
    }

    private async Task<ShippingTaxConfigurationResult> ResolveShippingTaxConfigurationAsync(
        string countryCode,
        string? stateCode,
        CancellationToken cancellationToken)
    {
        if (taxProviderManager == null)
        {
            return ShippingTaxConfigurationResult.NotTaxed();
        }

        return await taxProviderManager.GetShippingTaxConfigurationAsync(
            countryCode,
            stateCode,
            cancellationToken)
            ?? ShippingTaxConfigurationResult.NotTaxed();
    }

    private static Address BuildTaxAddressForBasket(Basket basket, string? countryCode, string? regionCode)
    {
        var shippingAddress = basket.ShippingAddress;
        if (!string.IsNullOrWhiteSpace(countryCode) && string.IsNullOrWhiteSpace(shippingAddress.CountryCode))
        {
            shippingAddress.CountryCode = countryCode;
        }

        if (!string.IsNullOrWhiteSpace(regionCode))
        {
            shippingAddress.CountyState ??= new CountyState();
            shippingAddress.CountyState.RegionCode = regionCode;
        }

        return shippingAddress;
    }

    private static List<TaxableLineItem> BuildTaxableLineItemsForCalculation(IEnumerable<LineItem> lineItems)
    {
        return lineItems
            .Where(li => li.LineItemType is LineItemType.Product or LineItemType.Custom or LineItemType.Addon)
            .Select(li => new TaxableLineItem
            {
                LineItemId = li.Id,
                Sku = string.IsNullOrWhiteSpace(li.Sku) ? li.Id.ToString("N") : li.Sku!,
                Name = li.Name ?? li.Sku ?? li.Id.ToString("N"),
                Amount = li.Amount,
                Quantity = li.Quantity,
                TaxGroupId = li.TaxGroupId,
                IsTaxable = li.IsTaxable
            })
            .ToList();
    }

    private static void ApplyProviderLineResultsToLineItems(
        IReadOnlyCollection<LineItem> lineItems,
        IReadOnlyCollection<LineTaxResult> lineResults)
    {
        if (lineResults.Count == 0)
        {
            return;
        }

        var taxableLineItems = lineItems
            .Where(li => li.LineItemType is LineItemType.Product or LineItemType.Custom or LineItemType.Addon)
            .ToList();

        var byId = taxableLineItems.ToDictionary(li => li.Id);
        var bySku = taxableLineItems
            .Where(li => !string.IsNullOrWhiteSpace(li.Sku))
            .GroupBy(li => li.Sku!, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => new Queue<LineItem>(g), StringComparer.OrdinalIgnoreCase);

        foreach (var lineResult in lineResults)
        {
            LineItem? lineItem = null;

            if (lineResult.LineItemId.HasValue && byId.TryGetValue(lineResult.LineItemId.Value, out var byIdItem))
            {
                lineItem = byIdItem;
            }
            else if (!string.IsNullOrWhiteSpace(lineResult.Sku)
                     && bySku.TryGetValue(lineResult.Sku, out var bySkuItems)
                     && bySkuItems.Count > 0)
            {
                lineItem = bySkuItems.Dequeue();
            }

            if (lineItem == null)
            {
                continue;
            }

            lineItem.TaxRate = lineResult.TaxRate;
            lineItem.IsTaxable = lineResult.IsTaxable;
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

        // Check per-request cache first (avoids redundant DB queries within the same request)
        if (httpContext?.Items.TryGetValue(BasketCacheKey, out var cached) == true && cached is Basket cachedBasket)
            return cachedBasket;

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

        // Cache for subsequent calls within this request
        if (basket != null && httpContext != null)
        {
            httpContext.Items[BasketCacheKey] = basket;
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
        if (parameters.ItemToAdd == null) return;

        // 1. Get existing basket info (may be from session with stale ConcurrencyStamp)
        var existingBasket = await GetBasket(new GetBasketParameters { CustomerId = parameters.CustomerId }, cancellationToken);
        var existingBasketId = existingBasket?.Id;

        Basket? basket = null;
        var isNewBasket = false;

        const int maxRetries = 3;
        for (var attempt = 0; attempt < maxRetries; attempt++)
        {
            using var scope = efCoreScopeProvider.CreateScope();
            try
            {
                await scope.ExecuteWithContextAsync<bool>(async db =>
                {
                    // 2. Load fresh basket from DB to avoid stale ConcurrencyStamp
                    if (existingBasketId.HasValue)
                    {
                        basket = await db.Baskets.FirstOrDefaultAsync(b => b.Id == existingBasketId.Value, cancellationToken);
                    }

                    if (basket == null)
                    {
                        isNewBasket = true;
                        basket = basketFactory.Create(
                            parameters.CustomerId,
                            _settings.StoreCurrencyCode,
                            _settings.CurrencySymbol);
                        db.Baskets.Add(basket);
                    }

                    // 3. Add the new item to the basket
                    var fallbackCountryCode = _settings.DefaultShippingCountry ?? "US";
                    var countryCode = !string.IsNullOrWhiteSpace(basket.ShippingAddress.CountryCode)
                        ? basket.ShippingAddress.CountryCode
                        : fallbackCountryCode;
                    await AddToBasketAsync(basket, parameters.ItemToAdd, countryCode, cancellationToken);

                    // 4. Update ConcurrencyStamp and save
                    basket.ConcurrencyStamp = Guid.NewGuid().ToString();
                    await db.SaveChangesAsync(cancellationToken);
                    return true;
                });

                scope.Complete();
                break; // Success, exit retry loop
            }
            catch (DbUpdateConcurrencyException ex)
            {
                if (attempt < maxRetries - 1)
                {
                    logger.LogWarning(ex, "Basket {BasketId} was modified concurrently during AddToBasket (attempt {Attempt}). Retrying.",
                        existingBasketId, attempt + 1);
                    continue;
                }

                logger.LogError(ex, "Basket {BasketId} concurrency conflict persisted after {MaxRetries} attempts in AddToBasket.",
                    existingBasketId, maxRetries);
                throw;
            }
        }

        // 5. If it's a new basket and for a guest user, update the cookie
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

        // 6. Update the basket stored in the session for immediate reflection on the UI
        if (basket != null)
        {
            if (httpContextAccessor.HttpContext != null) httpContextAccessor.HttpContext.Items[BasketCacheKey] = basket;
        }
    }

    /// <inheritdoc />
    public async Task<AddProductWithAddonsResult> AddProductWithAddonsAsync(
        AddProductWithAddonsParameters parameters,
        CancellationToken cancellationToken = default)
    {
        if (parameters.Quantity <= 0)
        {
            return AddProductWithAddonsResult.Failed("Quantity must be greater than zero");
        }

        // Get the product (variant) with ProductRoot - ProductOptions is JSON so automatically loaded with ProductRoot
        var product = await productService.GetProduct(new Products.Services.Parameters.GetProductParameters
        {
            ProductId = parameters.ProductId,
            IncludeProductRoot = true, // ProductOptions (JSON column) loads with ProductRoot for display name extraction
            IncludeProductFilters = true,
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

        var addonOptions = product.ProductRoot?.ProductOptions
            .Where(po => !po.IsVariant)
            .ToList() ?? [];
        var (normalizedAddons, addonValidationError) = ValidateAddonSelections(addonOptions, parameters.Addons);
        if (!string.IsNullOrWhiteSpace(addonValidationError))
        {
            return AddProductWithAddonsResult.Failed(addonValidationError);
        }

        // Create the main product line item
        var productLineItem = CreateLineItem(product, parameters.Quantity);
        var addonSelectionSignature = BuildAddonSelectionSignature(normalizedAddons);
        if (!string.IsNullOrEmpty(addonSelectionSignature))
        {
            productLineItem.ExtendedData[Constants.ExtendedDataKeys.AddonSelectionSignature] = addonSelectionSignature;
        }

        // Add main product to basket
        await AddToBasket(new AddToBasketParameters
        {
            ItemToAdd = productLineItem,
            CustomerId = parameters.CustomerId
        }, cancellationToken);

        // Resolve the persisted parent line item that now exists in the basket.
        // This matters when a matching line merges, because the merged line keeps the existing ID.
        var basketAfterProductAdd = await GetBasket(
            new GetBasketParameters { CustomerId = parameters.CustomerId },
            cancellationToken);
        if (basketAfterProductAdd == null)
        {
            return AddProductWithAddonsResult.Failed("Failed to retrieve basket after adding product");
        }

        var persistedProductLineItem = basketAfterProductAdd.LineItems
            .Where(li =>
                li.LineItemType == LineItemType.Product &&
                li.ProductId == product.Id &&
                string.Equals(li.Sku, productLineItem.Sku, StringComparison.Ordinal) &&
                string.Equals(
                    li.GetAddonSelectionSignature() ?? string.Empty,
                    addonSelectionSignature ?? string.Empty,
                    StringComparison.Ordinal))
            .OrderByDescending(li => li.DateUpdated)
            .FirstOrDefault();

        if (persistedProductLineItem != null)
        {
            productLineItem = persistedProductLineItem;
        }

        // Handle add-ons if any
        var addonLineItems = new List<LineItem>();

        if (normalizedAddons.Count > 0 && product.ProductRoot?.ProductOptions != null)
        {
            var valueLookup = addonOptions
                .SelectMany(o => o.ProductOptionValues.Select(v => (Option: o, Value: v)))
                .ToDictionary(x => x.Value.Id, x => x);

            foreach (var addon in normalizedAddons)
            {
                if (!valueLookup.TryGetValue(addon.ValueId, out var ov))
                    continue;

                var addonLineItem = lineItemFactory.CreateAddonForBasket(
                    product,
                    ov.Option,
                    ov.Value,
                    productLineItem.Sku ?? string.Empty,
                    productLineItem.Id,
                    parameters.Quantity);

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
        var existingBasket = await GetBasket(new GetBasketParameters(), cancellationToken);
        if (existingBasket == null)
        {
            return;
        }

        var basketId = existingBasket.Id;
        LineItem? updatedLineItem = null;
        var oldQuantity = 0;
        var removalCancelled = false;
        var updateCancelled = false;
        var publishQuantityChanged = false;
        var publishRemoved = false;

        var basket = await ExecuteBasketMutationWithRetryAsync(
            basketId,
            nameof(UpdateLineItemQuantity),
            async (db, currentBasket) =>
            {
                updatedLineItem = currentBasket.LineItems.FirstOrDefault(li => li.Id == lineItemId);
                if (updatedLineItem == null)
                {
                    return false;
                }

                if (quantity <= 0)
                {
                    var removingNotification = new BasketItemRemovingNotification(currentBasket, updatedLineItem);
                    if (await notificationPublisher.PublishCancelableAsync(removingNotification, cancellationToken))
                    {
                        currentBasket.Errors.Add(new()
                        {
                            Message = removingNotification.CancelReason ?? "Item removal was cancelled",
                            RelatedLineItemId = lineItemId
                        });
                        removalCancelled = true;
                    }
                    else
                    {
                        currentBasket.LineItems.Remove(updatedLineItem);
                        await CalculateBasketAsync(
                            new CalculateBasketParameters
                            {
                                Basket = currentBasket,
                                CountryCode = countryCode
                            },
                            cancellationToken);

                        if (checkoutDiscountService != null)
                        {
                            await checkoutDiscountService.Value.RefreshPromotionalDiscountsAsync(
                                currentBasket,
                                countryCode,
                                cancellationToken);
                        }

                        publishRemoved = true;
                    }

                    currentBasket.DateUpdated = DateTime.UtcNow;
                    currentBasket.ConcurrencyStamp = Guid.NewGuid().ToString();
                    await db.SaveChangesAsync(cancellationToken);
                    return true;
                }

                oldQuantity = updatedLineItem.Quantity;

                // Publish cancelable notification before changing quantity
                var changingNotification = new BasketItemQuantityChangingNotification(currentBasket, updatedLineItem, oldQuantity, quantity);
                if (await notificationPublisher.PublishCancelableAsync(changingNotification, cancellationToken))
                {
                    updateCancelled = true;
                    return false;
                }

                // Note: Stock validation happens at order submission time via IInventoryService.
                // The basket accepts any quantity; final validation occurs when creating the order.
                updatedLineItem.Quantity = quantity;
                currentBasket.DateUpdated = DateTime.UtcNow;
                await CalculateBasketAsync(
                    new CalculateBasketParameters
                    {
                        Basket = currentBasket,
                        CountryCode = countryCode
                    },
                    cancellationToken);

                if (checkoutDiscountService != null)
                {
                    await checkoutDiscountService.Value.RefreshPromotionalDiscountsAsync(
                        currentBasket,
                        countryCode,
                        cancellationToken);
                }

                currentBasket.ConcurrencyStamp = Guid.NewGuid().ToString();
                await db.SaveChangesAsync(cancellationToken);
                publishQuantityChanged = true;
                return true;
            },
            cancellationToken);

        if (updateCancelled)
        {
            return;
        }

        if (basket == null || updatedLineItem == null)
        {
            return;
        }

        if (quantity <= 0)
        {
            if (abandonedCheckoutService != null)
            {
                await abandonedCheckoutService.TrackCheckoutActivityAsync(basket.Id, cancellationToken);
            }

            if (!removalCancelled && publishRemoved)
            {
                await notificationPublisher.PublishAsync(
                    new BasketItemRemovedNotification(basket, updatedLineItem), cancellationToken);
            }

            return;
        }

        if (publishQuantityChanged)
        {
            // Track checkout activity for abandoned cart recovery (if checkout started)
            if (abandonedCheckoutService != null)
            {
                await abandonedCheckoutService.TrackCheckoutActivityAsync(basket.Id, cancellationToken);
            }

            await notificationPublisher.PublishAsync(
                new BasketItemQuantityChangedNotification(basket, updatedLineItem, oldQuantity, quantity), cancellationToken);
        }
    }

    /// <summary>
    /// Remove line item from basket
    /// </summary>
    public async Task RemoveLineItem(Guid lineItemId, string? countryCode = null, CancellationToken cancellationToken = default)
    {
        var existingBasket = await GetBasket(new GetBasketParameters(), cancellationToken);
        if (existingBasket == null)
        {
            return;
        }

        var basketId = existingBasket.Id;
        await ExecuteBasketMutationWithRetryAsync(
            basketId,
            nameof(RemoveLineItem),
            async (db, basket) =>
            {
                await RemoveFromBasketAsync(basket, lineItemId, countryCode, cancellationToken);
                basket.DateUpdated = DateTime.UtcNow;
                basket.ConcurrencyStamp = Guid.NewGuid().ToString();
                await db.SaveChangesAsync(cancellationToken);
                return true;
            },
            cancellationToken);
    }

    private async Task<Basket?> ExecuteBasketMutationWithRetryAsync(
        Guid basketId,
        string operationName,
        Func<MerchelloDbContext, Basket, Task<bool>> mutation,
        CancellationToken cancellationToken)
    {
        const int maxRetries = 3;

        for (var attempt = 0; attempt < maxRetries; attempt++)
        {
            using var scope = efCoreScopeProvider.CreateScope();
            Basket? basket = null;

            try
            {
                var mutated = await scope.ExecuteWithContextAsync(async db =>
                {
                    basket = await db.Baskets.FirstOrDefaultAsync(b => b.Id == basketId, cancellationToken);
                    if (basket == null)
                    {
                        return false;
                    }

                    return await mutation(db, basket);
                });
                scope.Complete();

                if (!mutated || basket == null)
                {
                    return null;
                }

                if (httpContextAccessor.HttpContext != null) httpContextAccessor.HttpContext.Items[BasketCacheKey] = basket;
                return basket;
            }
            catch (DbUpdateConcurrencyException ex)
            {
                if (attempt < maxRetries - 1)
                {
                    logger.LogWarning(
                        ex,
                        "Basket {BasketId} was modified concurrently during {OperationName} (attempt {Attempt}). Retrying.",
                        basketId,
                        operationName,
                        attempt + 1);
                    continue;
                }

                logger.LogError(
                    ex,
                    "Basket {BasketId} concurrency conflict persisted after {MaxRetries} attempts in {OperationName}.",
                    basketId,
                    maxRetries,
                    operationName);
                throw;
            }
        }

        return null;
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
    public Task<IReadOnlyCollection<CountryAvailability>> GetAvailableCountriesAsync(
        GetAvailableShippingCountriesParameters parameters,
        CancellationToken cancellationToken = default)
    {
        return _locationsService.GetAvailableCountriesAsync(
            new GetAvailableCountriesParameters(),
            cancellationToken);
    }

    public async Task<IReadOnlyCollection<RegionAvailability>> GetAvailableRegionsAsync(
        GetAvailableShippingRegionsParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var countryCode = parameters.CountryCode;

        // Start from globally available regions (warehouse service regions + catalog)
        var regions = await _locationsService.GetAvailableRegionsAsync(
            new GetAvailableRegionsParameters { CountryCode = countryCode },
            cancellationToken);

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
                                
                .Include(product => product.ProductRoot)
                    .ThenInclude(pr => pr!.ProductRootWarehouses)
                        .ThenInclude(prw => prw.Warehouse)
                            
                .Include(product => product.ShippingOptions)
                    
                .Include(product => product.ShippingOptions)
                    .ThenInclude(option => option.Warehouse)
                        
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
    public Task<IReadOnlyCollection<CountryInfo>> GetAllCountriesAsync(
        GetAvailableBillingCountriesParameters parameters,
        CancellationToken cancellationToken = default)
        => localityCatalog.GetCountriesAsync(cancellationToken);

    /// <summary>
    /// Gets all regions for a country from the locality catalog (for billing address which has no restrictions).
    /// </summary>
    public Task<IReadOnlyCollection<SubdivisionInfo>> GetAllRegionsAsync(
        GetAvailableBillingRegionsParameters parameters,
        CancellationToken cancellationToken = default)
        => localityCatalog.GetRegionsAsync(parameters.CountryCode, cancellationToken);

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

        var basketId = basket.Id;
        var currencySymbol = currencyService.GetCurrency(newCurrencyCode).Symbol;
        const int maxRetries = 3;

        for (var attempt = 0; attempt < maxRetries; attempt++)
        {
            using var scope = efCoreScopeProvider.CreateScope();
            Basket? updatedBasket = null;
            var hasEarlyResult = false;

            try
            {
                result.Messages.Clear();

                await scope.ExecuteWithContextAsync<bool>(async db =>
                {
                    updatedBasket = await db.Baskets.FirstOrDefaultAsync(b => b.Id == basketId, cancellationToken);
                    if (updatedBasket == null)
                    {
                        result.Messages.Add(new ResultMessage
                        {
                            Message = "Basket not found",
                            ResultMessageType = ResultMessageType.Error
                        });
                        hasEarlyResult = true;
                        return false;
                    }

                    // Publish "Before" notification - handlers can cancel
                    var changingNotification = new BasketCurrencyChangingNotification(
                        updatedBasket, storeCurrencyCode, newCurrencyCode, rate.Value);

                    if (await notificationPublisher.PublishCancelableAsync(changingNotification, cancellationToken))
                    {
                        result.Messages.Add(new ResultMessage
                        {
                            Message = changingNotification.CancelReason ?? "Currency change cancelled.",
                            ResultMessageType = ResultMessageType.Error
                        });
                        hasEarlyResult = true;
                        return false;
                    }

                    // NOTE: We intentionally do NOT modify basket amounts here.
                    // Basket amounts always stay in store currency.
                    // Display conversion happens at render time using DisplayCurrencyExtensions.

                    // Update display preference only - NO amount conversion (Shopify approach)
                    updatedBasket.Currency = newCurrencyCode;
                    updatedBasket.CurrencySymbol = currencySymbol;
                    updatedBasket.DateUpdated = DateTime.UtcNow;

                    updatedBasket.ConcurrencyStamp = Guid.NewGuid().ToString();
                    await db.SaveChangesAsync(cancellationToken);
                    return true;
                });
                scope.Complete();

                if (hasEarlyResult)
                {
                    return result;
                }

                if (updatedBasket == null)
                {
                    result.Messages.Add(new ResultMessage
                    {
                        Message = "Basket not found",
                        ResultMessageType = ResultMessageType.Error
                    });
                    return result;
                }

                if (httpContextAccessor.HttpContext != null) httpContextAccessor.HttpContext.Items[BasketCacheKey] = updatedBasket;

                // Publish "After" notification (rate provided for notification handlers that need it)
                await notificationPublisher.PublishAsync(
                    new BasketCurrencyChangedNotification(updatedBasket, storeCurrencyCode, newCurrencyCode, rate.Value),
                    cancellationToken);

                result.ResultObject = updatedBasket;
                return result;
            }
            catch (DbUpdateConcurrencyException ex)
            {
                if (attempt < maxRetries - 1)
                {
                    logger.LogWarning(ex,
                        "Basket {BasketId} was modified concurrently during ConvertBasketCurrencyAsync (attempt {Attempt}). Retrying.",
                        basketId, attempt + 1);
                    continue;
                }

                logger.LogError(ex,
                    "Basket {BasketId} concurrency conflict persisted after {MaxRetries} attempts in ConvertBasketCurrencyAsync.",
                    basketId, maxRetries);
                throw;
            }
        }

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
            var basketId = parameters.Basket.Id;
            const int maxRetries = 3;

            for (var attempt = 0; attempt < maxRetries; attempt++)
            {
                using var scope = efCoreScopeProvider.CreateScope();
                Basket? updatedBasket = null;

                try
                {
                    await scope.ExecuteWithContextAsync<bool>(async db =>
                    {
                        updatedBasket = await db.Baskets.FirstOrDefaultAsync(b => b.Id == basketId, cancellationToken);
                        if (updatedBasket == null)
                        {
                            updatedBasket = parameters.Basket;
                            updatedBasket.Currency = parameters.CurrencyCode;
                            updatedBasket.CurrencySymbol = parameters.CurrencySymbol;
                            updatedBasket.DateUpdated = DateTime.UtcNow;
                            updatedBasket.ConcurrencyStamp = Guid.NewGuid().ToString();
                            db.Baskets.Add(updatedBasket);
                            await db.SaveChangesAsync(cancellationToken);
                            return true;
                        }

                        if (string.Equals(updatedBasket.Currency, parameters.CurrencyCode, StringComparison.OrdinalIgnoreCase))
                        {
                            return true;
                        }

                        updatedBasket.Currency = parameters.CurrencyCode;
                        updatedBasket.CurrencySymbol = parameters.CurrencySymbol;
                        updatedBasket.DateUpdated = DateTime.UtcNow;
                        updatedBasket.ConcurrencyStamp = Guid.NewGuid().ToString();
                        await db.SaveChangesAsync(cancellationToken);
                        return true;
                    });
                    scope.Complete();

                    if (updatedBasket != null)
                    {
                        if (httpContextAccessor.HttpContext != null) httpContextAccessor.HttpContext.Items[BasketCacheKey] = updatedBasket;
                        return updatedBasket;
                    }

                    return parameters.Basket;
                }
                catch (DbUpdateConcurrencyException ex)
                {
                    if (attempt < maxRetries - 1)
                    {
                        logger.LogWarning(ex,
                            "Basket {BasketId} was modified concurrently during EnsureBasketCurrencyAsync (attempt {Attempt}). Retrying.",
                            basketId, attempt + 1);
                        continue;
                    }

                    logger.LogError(ex,
                        "Basket {BasketId} concurrency conflict persisted after {MaxRetries} attempts in EnsureBasketCurrencyAsync.",
                        basketId, maxRetries);
                    throw;
                }
            }
        }

        return parameters.Basket;
    }

    private async Task SyncBasketCurrencyToCountryAsync(
        Basket basket,
        string? countryCode,
        CancellationToken cancellationToken)
    {
        if (countryCurrencyMappingService == null || string.IsNullOrWhiteSpace(countryCode))
        {
            return;
        }

        var mappedCurrency = countryCurrencyMappingService.GetCurrencyForCountry(countryCode);
        if (string.IsNullOrWhiteSpace(mappedCurrency))
        {
            return;
        }

        if (string.Equals(basket.Currency, mappedCurrency, StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        // If mapping changes away from store currency, ensure we have a valid exchange rate.
        if (!string.Equals(_settings.StoreCurrencyCode, mappedCurrency, StringComparison.OrdinalIgnoreCase))
        {
            var rate = await exchangeRateCache.GetRateAsync(_settings.StoreCurrencyCode, mappedCurrency, cancellationToken);
            if (rate is null or <= 0m)
            {
                logger.LogWarning(
                    "Exchange rate unavailable for {StoreCurrency} -> {MappedCurrency}. Basket {BasketId} currency not updated.",
                    _settings.StoreCurrencyCode,
                    mappedCurrency,
                    basket.Id);
                return;
            }
        }

        basket.Currency = mappedCurrency;
        basket.CurrencySymbol = currencyService.GetCurrency(mappedCurrency).Symbol;
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
            var isDigital = productRoot.IsDigitalProduct;
            lineItem.ExtendedData["IsDigital"] = isDigital;
            lineItem.ExtendedData[Constants.ExtendedDataKeys.IsPhysicalProduct] = !isDigital;

            lineItem.ExtendedData[Constants.ExtendedDataKeys.ProductTypeId] = productRoot.ProductTypeId.ToString();

            // Add collection IDs if collections are loaded
            if (productRoot.Collections.Count > 0)
            {
                var collectionIds = productRoot.Collections.Select(c => c.Id).ToList();
                lineItem.ExtendedData[Constants.ExtendedDataKeys.CollectionIds] = JsonSerializer.Serialize(collectionIds);
            }

            if (product.Filters is { Count: > 0 })
            {
                var filterIds = product.Filters.Select(f => f.Id).ToList();
                lineItem.ExtendedData[Constants.ExtendedDataKeys.FilterIds] = JsonSerializer.Serialize(filterIds);
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
        GetOrderGroupsParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var basket = parameters.Basket;
        var session = parameters.Session;

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

        // Build warehouse lookup from loaded products to avoid loading all warehouses
        var warehouseDict = new Dictionary<Guid, Warehouse>();
        foreach (var product in products)
        {
            if (product.ProductRoot?.ProductRootWarehouses != null)
            {
                foreach (var prw in product.ProductRoot.ProductRootWarehouses)
                {
                    if (prw.Warehouse == null) continue;
                    warehouseDict.TryAdd(prw.Warehouse.Id, prw.Warehouse);
                }
            }

            if (product.ProductWarehouses != null)
            {
                foreach (var pw in product.ProductWarehouses)
                {
                    if (pw.Warehouse == null) continue;
                    warehouseDict.TryAdd(pw.Warehouse.Id, pw.Warehouse);
                }
            }
        }

        if (warehouseDict.Count == 0)
        {
            var warehouses = await warehouseService.GetWarehouses(cancellationToken);
            warehouseDict = warehouses.ToDictionary(w => w.Id);
        }

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

        if (parameters.IsPartial)
        {
            var basketId = basket.Id;
            Basket? updatedBasket = null;
            var hasChanges = false;
            const int maxRetries = 3;

            for (var attempt = 0; attempt < maxRetries; attempt++)
            {
                using var scope = efCoreScopeProvider.CreateScope();
                try
                {
                    hasChanges = false;
                    await scope.ExecuteWithContextAsync<bool>(async db =>
                    {
                        updatedBasket = await db.Baskets.FirstOrDefaultAsync(b => b.Id == basketId, cancellationToken);
                        if (updatedBasket == null)
                        {
                            return false;
                        }

                        if (!string.IsNullOrWhiteSpace(parameters.Email))
                        {
                            updatedBasket.BillingAddress.Email = parameters.Email.Trim();
                            hasChanges = true;
                        }

                        if (parameters.BillingAddress != null)
                        {
                            hasChanges |= UpdateAddressFromDto(updatedBasket.BillingAddress, parameters.BillingAddress);
                        }

                        if (parameters.ShippingSameAsBilling && parameters.BillingAddress != null)
                        {
                            CopyAddress(updatedBasket.BillingAddress, updatedBasket.ShippingAddress);
                            hasChanges = true;
                        }
                        else if (!parameters.ShippingSameAsBilling && parameters.ShippingAddress != null)
                        {
                            hasChanges |= UpdateAddressFromDto(updatedBasket.ShippingAddress, parameters.ShippingAddress);
                        }

                        if (!hasChanges)
                        {
                            return true;
                        }

                        await SyncBasketCurrencyToCountryAsync(updatedBasket, updatedBasket.ShippingAddress.CountryCode, cancellationToken);
                        updatedBasket.ConcurrencyStamp = Guid.NewGuid().ToString();
                        await db.SaveChangesAsync(cancellationToken);
                        return true;
                    });
                    scope.Complete();

                    if (updatedBasket == null)
                    {
                        result.Messages.Add(new ResultMessage
                        {
                            Message = "Basket not found",
                            ResultMessageType = ResultMessageType.Error
                        });
                        return result;
                    }

                    if (!hasChanges)
                    {
                        result.ResultObject = updatedBasket;
                        return result;
                    }

                    if (httpContextAccessor.HttpContext != null) httpContextAccessor.HttpContext.Items[BasketCacheKey] = updatedBasket;

                    var session = await checkoutSessionService.GetSessionAsync(updatedBasket.Id, cancellationToken);
                    await checkoutSessionService.SaveAddressesAsync(new SaveSessionAddressesParameters
                    {
                        BasketId = updatedBasket.Id,
                        Billing = updatedBasket.BillingAddress,
                        Shipping = updatedBasket.ShippingAddress,
                        SameAsBilling = parameters.ShippingSameAsBilling,
                        AcceptsMarketing = session.AcceptsMarketing
                    }, cancellationToken);

                    if (abandonedCheckoutService != null && !string.IsNullOrWhiteSpace(updatedBasket.BillingAddress.Email))
                    {
                        await abandonedCheckoutService.TrackCheckoutActivityAsync(
                            updatedBasket,
                            updatedBasket.BillingAddress.Email,
                            cancellationToken);
                    }

                    result.ResultObject = updatedBasket;
                    return result;
                }
                catch (DbUpdateConcurrencyException ex)
                {
                    if (attempt < maxRetries - 1)
                    {
                        logger.LogWarning(ex,
                            "Basket {BasketId} was modified concurrently during SaveAddressesAsync (partial) (attempt {Attempt}). Retrying.",
                            basketId, attempt + 1);
                        continue;
                    }

                    logger.LogError(ex,
                        "Basket {BasketId} concurrency conflict persisted after {MaxRetries} attempts in SaveAddressesAsync (partial).",
                        basketId, maxRetries);
                    throw;
                }
                catch (DbUpdateException ex) when (IsTransientSqliteLockException(ex))
                {
                    if (attempt < maxRetries - 1)
                    {
                        var delay = GetSqliteLockRetryDelay(attempt);
                        logger.LogWarning(ex,
                            "Basket {BasketId} hit SQLite lock during SaveAddressesAsync (partial) (attempt {Attempt}). Retrying in {DelayMs}ms.",
                            basketId, attempt + 1, delay.TotalMilliseconds);
                        await Task.Delay(delay, cancellationToken);
                        continue;
                    }

                    logger.LogError(ex,
                        "Basket {BasketId} SQLite lock persisted after {MaxRetries} attempts in SaveAddressesAsync (partial).",
                        basketId, maxRetries);
                    throw;
                }
            }

            return result;
        }

        if (string.IsNullOrWhiteSpace(parameters.Email) || parameters.BillingAddress == null)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = "Email and billing address are required.",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        if (!System.Net.Mail.MailAddress.TryCreate(parameters.Email, out _))
        {
            result.Messages.Add(new ResultMessage
            {
                Message = "Invalid email address format.",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        // Map DTOs to Address models
        var fullBasketId = basket.Id;
        Basket? fullUpdatedBasket = null;
        Address? appliedBillingAddress = null;
        Address? appliedShippingAddress = null;
        const int fullMaxRetries = 3;

        for (var attempt = 0; attempt < fullMaxRetries; attempt++)
        {
            using var scope = efCoreScopeProvider.CreateScope();
            var updateCancelled = false;

            try
            {
                await scope.ExecuteWithContextAsync<bool>(async db =>
                {
                    fullUpdatedBasket = await db.Baskets.FirstOrDefaultAsync(b => b.Id == fullBasketId, cancellationToken);
                    if (fullUpdatedBasket == null)
                    {
                        return false;
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
                        fullUpdatedBasket, billingAddress, shippingAddress, parameters.ShippingSameAsBilling);

                    if (await notificationPublisher.PublishCancelableAsync(changingNotification, cancellationToken))
                    {
                        result.Messages.Add(new ResultMessage
                        {
                            Message = changingNotification.CancelReason ?? "Address change cancelled",
                            ResultMessageType = ResultMessageType.Error
                        });
                        updateCancelled = true;
                        return false;
                    }

                    // Use potentially modified addresses from handlers
                    billingAddress = changingNotification.BillingAddress;
                    shippingAddress = changingNotification.ShippingAddress;

                    appliedBillingAddress = billingAddress;
                    appliedShippingAddress = shippingAddress;

                    // Check if addresses actually changed to avoid phantom invoice creation
                    // When the same addresses are re-submitted, we don't want to invalidate existing unpaid invoices
                    var addressesChanged = !AddressesEqual(fullUpdatedBasket.BillingAddress, billingAddress) ||
                                           !AddressesEqual(fullUpdatedBasket.ShippingAddress, shippingAddress);

                    // Capture totals before recalculation to detect if discounts/taxes changed
                    var previousTotal = fullUpdatedBasket.Total;
                    var previousDiscount = fullUpdatedBasket.Discount;
                    var previousTax = fullUpdatedBasket.Tax;

                    // Update basket addresses
                    fullUpdatedBasket.BillingAddress = billingAddress;
                    fullUpdatedBasket.ShippingAddress = shippingAddress;

                    await SyncBasketCurrencyToCountryAsync(fullUpdatedBasket, shippingAddress.CountryCode, cancellationToken);

                    // Recalculate with the new shipping address country
                    await CalculateBasketAsync(new CalculateBasketParameters
                    {
                        Basket = fullUpdatedBasket,
                        CountryCode = shippingAddress.CountryCode
                    }, cancellationToken);

                    // Refresh promotional discounts (automatic + code) after address changes.
                    if (checkoutDiscountService != null)
                    {
                        var refreshResult = await checkoutDiscountService.Value.RefreshPromotionalDiscountsAsync(
                            fullUpdatedBasket,
                            shippingAddress.CountryCode,
                            cancellationToken);
                        fullUpdatedBasket = refreshResult.ResultObject ?? fullUpdatedBasket;
                        result.Messages.AddRange(refreshResult.Messages
                            .Where(m => m.ResultMessageType != ResultMessageType.Error));
                    }

                    // Update timestamp if addresses changed OR if totals changed after recalculation
                    // This ensures invoice dedup creates a new invoice when discounts/taxes change
                    var totalsChanged = fullUpdatedBasket.Total != previousTotal ||
                                        fullUpdatedBasket.Discount != previousDiscount ||
                                        fullUpdatedBasket.Tax != previousTax;

                    if (addressesChanged || totalsChanged)
                    {
                        fullUpdatedBasket.DateUpdated = DateTime.UtcNow;
                    }

                    fullUpdatedBasket.ConcurrencyStamp = Guid.NewGuid().ToString();
                    await db.SaveChangesAsync(cancellationToken);
                    return true;
                });
                scope.Complete();

                if (updateCancelled)
                {
                    return result;
                }

                if (fullUpdatedBasket == null || appliedBillingAddress == null || appliedShippingAddress == null)
                {
                    result.Messages.Add(new ResultMessage
                    {
                        Message = "Basket not found",
                        ResultMessageType = ResultMessageType.Error
                    });
                    return result;
                }

                if (httpContextAccessor.HttpContext != null) httpContextAccessor.HttpContext.Items[BasketCacheKey] = fullUpdatedBasket;

                // Update checkout session
                await checkoutSessionService.SaveAddressesAsync(new SaveSessionAddressesParameters
                {
                    BasketId = fullUpdatedBasket.Id,
                    Billing = appliedBillingAddress,
                    Shipping = appliedShippingAddress,
                    SameAsBilling = parameters.ShippingSameAsBilling,
                    AcceptsMarketing = parameters.AcceptsMarketing
                }, cancellationToken);

                await checkoutSessionService.SetCurrentStepAsync(fullUpdatedBasket.Id, CheckoutStep.Shipping, cancellationToken);

                // Publish "After" notification
                await notificationPublisher.PublishAsync(
                    new CheckoutAddressesChangedNotification(fullUpdatedBasket, appliedBillingAddress, appliedShippingAddress, parameters.ShippingSameAsBilling),
                    cancellationToken);

                // Track checkout activity for abandoned cart recovery (creates record on first email capture)
                if (abandonedCheckoutService != null && !string.IsNullOrWhiteSpace(parameters.Email))
                {
                    await abandonedCheckoutService.TrackCheckoutActivityAsync(fullUpdatedBasket, parameters.Email, cancellationToken);
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
                                Name = appliedBillingAddress.Name ?? parameters.Email
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

                result.ResultObject = fullUpdatedBasket;
                return result;
            }
            catch (DbUpdateConcurrencyException ex)
            {
                if (attempt < fullMaxRetries - 1)
                {
                    logger.LogWarning(ex,
                        "Basket {BasketId} was modified concurrently during SaveAddressesAsync (attempt {Attempt}). Retrying.",
                        fullBasketId, attempt + 1);
                    continue;
                }

                logger.LogError(ex,
                    "Basket {BasketId} concurrency conflict persisted after {MaxRetries} attempts in SaveAddressesAsync.",
                    fullBasketId, fullMaxRetries);
                throw;
            }
            catch (DbUpdateException ex) when (IsTransientSqliteLockException(ex))
            {
                if (attempt < fullMaxRetries - 1)
                {
                    var delay = GetSqliteLockRetryDelay(attempt);
                    logger.LogWarning(ex,
                        "Basket {BasketId} hit SQLite lock during SaveAddressesAsync (attempt {Attempt}). Retrying in {DelayMs}ms.",
                        fullBasketId, attempt + 1, delay.TotalMilliseconds);
                    await Task.Delay(delay, cancellationToken);
                    continue;
                }

                logger.LogError(ex,
                    "Basket {BasketId} SQLite lock persisted after {MaxRetries} attempts in SaveAddressesAsync.",
                    fullBasketId, fullMaxRetries);
                throw;
            }
        }

        return result;
    }

    private Locality.Models.Address MapDtoToAddress(AddressDto dto)
    {
        var address = addressFactory.CreateAddress(
            dto.Name,
            dto.AddressOne,
            dto.AddressTwo,
            dto.TownCity,
            dto.PostalCode,
            dto.CountryCode,
            dto.CountyState,
            dto.RegionCode,
            dto.Company,
            dto.Phone,
            dto.Email);
        address.Country = dto.Country;
        return address;
    }

    /// <inheritdoc />
    public async Task SaveBasketAsync(SaveBasketParameters parameters, CancellationToken cancellationToken = default)
    {
        var basket = parameters.Basket;
        const int maxRetries = 3;

        for (var attempt = 0; attempt < maxRetries; attempt++)
        {
            using var scope = efCoreScopeProvider.CreateScope();
            try
            {
                await scope.ExecuteWithContextAsync<bool>(async db =>
                {
                    var freshBasket = await db.Baskets.FirstOrDefaultAsync(b => b.Id == basket.Id, cancellationToken);
                    if (freshBasket != null)
                    {
                        db.Entry(freshBasket).CurrentValues.SetValues(basket);
                        freshBasket.ConcurrencyStamp = Guid.NewGuid().ToString();
                        await db.SaveChangesAsync(cancellationToken);
                        basket.ConcurrencyStamp = freshBasket.ConcurrencyStamp;
                    }
                    else
                    {
                        basket.ConcurrencyStamp = Guid.NewGuid().ToString();
                        db.Baskets.Add(basket);
                        await db.SaveChangesAsync(cancellationToken);
                    }
                    return true;
                });
                scope.Complete();

                // Update per-request cache
                if (httpContextAccessor.HttpContext != null) httpContextAccessor.HttpContext.Items[BasketCacheKey] = basket;
                return;
            }
            catch (DbUpdateConcurrencyException ex)
            {
                if (attempt < maxRetries - 1)
                {
                    logger.LogWarning(ex, "Basket {BasketId} was modified concurrently (attempt {Attempt}). Retrying.", basket.Id, attempt + 1);
                    continue;
                }

                logger.LogError(ex, "Basket {BasketId} concurrency conflict persisted after {MaxRetries} attempts.", basket.Id, maxRetries);
                throw;
            }
        }
    }

    private static bool UpdateAddressFromDto(Locality.Models.Address address, AddressDto dto)
    {
        var changed = false;

        if (!string.IsNullOrEmpty(dto.Name)) { address.Name = dto.Name; changed = true; }
        if (!string.IsNullOrEmpty(dto.Company)) { address.Company = dto.Company; changed = true; }
        if (!string.IsNullOrEmpty(dto.AddressOne)) { address.AddressOne = dto.AddressOne; changed = true; }
        if (dto.AddressTwo != null) { address.AddressTwo = dto.AddressTwo; changed = true; }
        if (!string.IsNullOrEmpty(dto.TownCity)) { address.TownCity = dto.TownCity; changed = true; }
        if (!string.IsNullOrEmpty(dto.PostalCode)) { address.PostalCode = dto.PostalCode; changed = true; }
        if (!string.IsNullOrEmpty(dto.Country)) { address.Country = dto.Country; changed = true; }
        if (!string.IsNullOrEmpty(dto.CountryCode)) { address.CountryCode = dto.CountryCode; changed = true; }
        if (!string.IsNullOrEmpty(dto.Phone)) { address.Phone = dto.Phone; changed = true; }

        if (!string.IsNullOrEmpty(dto.CountyState) || !string.IsNullOrEmpty(dto.RegionCode))
        {
            address.CountyState ??= new Locality.Models.CountyState();
            if (!string.IsNullOrEmpty(dto.CountyState)) { address.CountyState.Name = dto.CountyState; changed = true; }
            if (!string.IsNullOrEmpty(dto.RegionCode)) { address.CountyState.RegionCode = dto.RegionCode; changed = true; }
            else if (!string.IsNullOrEmpty(dto.CountyState) && string.IsNullOrEmpty(address.CountyState.RegionCode))
            {
                address.CountyState.RegionCode = dto.CountyState;
                changed = true;
            }
        }

        return changed;
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
        var basketId = parameters.Basket.Id;
        var session = parameters.Session;
        var selections = parameters.Selections;
        var deliveryDates = parameters.DeliveryDates;

        const int maxRetries = 3;

        for (var attempt = 0; attempt < maxRetries; attempt++)
        {
            using var scope = efCoreScopeProvider.CreateScope();
            Basket? updatedBasket = null;
            Dictionary<Guid, string> finalSelections = new(selections);
            var earlyResult = new CrudResult<Basket>();
            var hasEarlyResult = false;

            try
            {
                await scope.ExecuteWithContextAsync<bool>(async db =>
                {
                    updatedBasket = await db.Baskets.FirstOrDefaultAsync(b => b.Id == basketId, cancellationToken);
                    if (updatedBasket == null)
                    {
                        hasEarlyResult = true;
                        earlyResult.Messages.Add(new ResultMessage
                        {
                            Message = "Basket not found",
                            ResultMessageType = ResultMessageType.Error
                        });
                        return false;
                    }

                    // Publish "Before" notification - handlers can cancel or modify selections
                    var changingNotification = new ShippingSelectionChangingNotification(
                        updatedBasket, new Dictionary<Guid, string>(selections));

                    if (await notificationPublisher.PublishCancelableAsync(changingNotification, cancellationToken))
                    {
                        hasEarlyResult = true;
                        earlyResult.Messages.Add(new ResultMessage
                        {
                            Message = changingNotification.CancelReason ?? "Shipping selection change cancelled",
                            ResultMessageType = ResultMessageType.Error
                        });
                        return false;
                    }

                    // Use potentially modified selections from handlers
                    finalSelections = changingNotification.ShippingSelections;

                    // Check if shipping selections actually changed to avoid phantom invoice creation
                    // When the same selections are re-submitted, we don't want to invalidate existing unpaid invoices
                    var selectionsChanged = !ShippingSelectionsEqual(session.SelectedShippingOptions, finalSelections);

                    // Capture totals before recalculation to detect if discounts/taxes changed
                    var previousTotal = updatedBasket.Total;
                    var previousDiscount = updatedBasket.Discount;
                    var previousTax = updatedBasket.Tax;
                    var previousShipping = updatedBasket.Shipping;

                    // Update session with selections
                    session.SelectedShippingOptions = finalSelections;
                    if (deliveryDates != null)
                    {
                        session.SelectedDeliveryDates = deliveryDates;
                    }

                    // Get order groups with the new selections to calculate shipping costs
                    var groupingResult = await GetOrderGroupsAsync(
                        new GetOrderGroupsParameters
                        {
                            Basket = updatedBasket,
                            Session = session
                        },
                        cancellationToken);

                    if (!groupingResult.Success)
                    {
                        hasEarlyResult = true;
                        foreach (var error in groupingResult.Errors)
                        {
                            earlyResult.Messages.Add(new ResultMessage { Message = error, ResultMessageType = ResultMessageType.Error });
                        }
                        return false;
                    }

                    // Calculate total shipping cost from selected options and store quoted costs
                    decimal totalShipping = 0;
                    var quotedCosts = session.QuotedShippingCosts;
                    foreach (var group in groupingResult.Groups)
                    {
                        if (!string.IsNullOrEmpty(group.SelectedShippingOptionId))
                        {
                            var selectedOption = group.AvailableShippingOptions
                                .FirstOrDefault(o => o.SelectionKey == group.SelectedShippingOptionId);

                            if (selectedOption != null)
                            {
                                var costToCharge = selectedOption.Cost;
                                if (quotedCosts.TryGetValue(group.GroupId, out var quoted) && quoted.Cost > 0)
                                {
                                    // Only honor server-stored quotes (never trust client-provided values).
                                    // Take the lower of quoted vs live: customer never pays more than quoted,
                                    // but also benefits from any rate decrease.
                                    costToCharge = Math.Min(selectedOption.Cost, quoted.Cost);

                                    var smallestUnit = 1m / (decimal)Math.Pow(10, currencyService.GetDecimalPlaces(_settings.StoreCurrencyCode));
                                    if (Math.Abs(selectedOption.Cost - costToCharge) > smallestUnit)
                                    {
                                        logger.LogWarning(
                                            "Shipping rate adjusted for group {GroupId}: quoted {QuotedCost}, live {LiveCost}, charged {ChargedCost}",
                                            group.GroupId, quoted.Cost, selectedOption.Cost, costToCharge);
                                    }
                                }

                                if (costToCharge < 0)
                                {
                                    costToCharge = 0;
                                }

                                totalShipping += costToCharge;
                                session.QuotedShippingCosts[group.GroupId] = new QuotedShippingCost(costToCharge, DateTime.UtcNow);
                            }
                            else
                            {
                                hasEarlyResult = true;
                                earlyResult.Messages.Add(new ResultMessage
                                {
                                    ResultMessageType = ResultMessageType.Error,
                                    Message = "Selected shipping option is no longer available. Please reselect shipping."
                                });
                                return false;
                            }
                        }
                    }

                    // Recalculate totals with the selected shipping amount
                    await CalculateBasketAsync(new CalculateBasketParameters
                    {
                        Basket = updatedBasket,
                        CountryCode = session.ShippingAddress.CountryCode,
                        ShippingAmountOverride = totalShipping
                    }, cancellationToken);

                    // Refresh promotional discounts (shipping changes can invalidate code/auto discounts).
                    if (checkoutDiscountService != null)
                    {
                        var refreshResult = await checkoutDiscountService.Value.RefreshPromotionalDiscountsAsync(
                            updatedBasket,
                            session.ShippingAddress.CountryCode,
                            cancellationToken);
                        updatedBasket = refreshResult.ResultObject ?? updatedBasket;
                        earlyResult.Messages.AddRange(refreshResult.Messages
                            .Where(m => m.ResultMessageType != ResultMessageType.Error));
                    }

                    // Update timestamp if selections changed OR if totals changed after recalculation
                    // This ensures invoice dedup creates a new invoice when shipping/discounts/taxes change
                    var totalsChanged = updatedBasket.Total != previousTotal ||
                                        updatedBasket.Discount != previousDiscount ||
                                        updatedBasket.Tax != previousTax ||
                                        updatedBasket.Shipping != previousShipping;

                    if (selectionsChanged || totalsChanged)
                    {
                        updatedBasket.DateUpdated = DateTime.UtcNow;
                    }

                    updatedBasket.ConcurrencyStamp = Guid.NewGuid().ToString();
                    await db.SaveChangesAsync(cancellationToken);
                    return true;
                });
                scope.Complete();

                if (hasEarlyResult)
                {
                    return earlyResult;
                }

                if (updatedBasket == null)
                {
                    earlyResult.Messages.Add(new ResultMessage
                    {
                        Message = "Basket not found",
                        ResultMessageType = ResultMessageType.Error
                    });
                    return earlyResult;
                }

                if (httpContextAccessor.HttpContext != null) httpContextAccessor.HttpContext.Items[BasketCacheKey] = updatedBasket;

                // Persist shipping selections and quoted costs to checkout session
                await checkoutSessionService.SaveShippingSelectionsAsync(new SaveSessionShippingSelectionsParameters
                {
                    BasketId = updatedBasket.Id,
                    Selections = finalSelections,
                    DeliveryDates = deliveryDates,
                    QuotedCosts = session.QuotedShippingCosts
                }, cancellationToken);

                // Set checkout step to Payment
                await checkoutSessionService.SetCurrentStepAsync(updatedBasket.Id, CheckoutStep.Payment, cancellationToken);

                // Publish "After" notification
                await notificationPublisher.PublishAsync(
                    new ShippingSelectionChangedNotification(updatedBasket, finalSelections),
                    cancellationToken);

                // Track checkout activity for abandoned cart recovery
                if (abandonedCheckoutService != null)
                {
                    await abandonedCheckoutService.TrackCheckoutActivityAsync(updatedBasket.Id, cancellationToken);
                }

                return new CrudResult<Basket> { ResultObject = updatedBasket };
            }
            catch (DbUpdateConcurrencyException ex)
            {
                if (attempt < maxRetries - 1)
                {
                    logger.LogWarning(ex,
                        "Basket {BasketId} was modified concurrently during SaveShippingSelectionsAsync (attempt {Attempt}). Retrying.",
                        basketId, attempt + 1);
                    continue;
                }

                logger.LogError(ex,
                    "Basket {BasketId} concurrency conflict persisted after {MaxRetries} attempts in SaveShippingSelectionsAsync.",
                    basketId, maxRetries);
                throw;
            }
        }

        return new CrudResult<Basket>();
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
                    l.LineItemType == LineItemType.Product ||
                    l.LineItemType == LineItemType.Custom ||
                    l.LineItemType == LineItemType.Addon))
                {
                    var lineTotal = li.Quantity * li.Amount;

                    // Get display data from ExtendedData
                    var imageUrl = li.ExtendedData?.GetValueOrDefault("ImageUrl").UnwrapJsonElement()?.ToString();
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
                        FormattedUnitPrice = currencyService.FormatAmount(li.Amount, currencyCode),
                        FormattedLineTotal = currencyService.FormatAmount(lineTotal, currencyCode),
                        // Display fields match store currency (no conversion in core service)
                        DisplayUnitPrice = li.Amount,
                        DisplayLineTotal = lineTotal,
                        FormattedDisplayUnitPrice = currencyService.FormatAmount(li.Amount, currencyCode),
                        FormattedDisplayLineTotal = currencyService.FormatAmount(lineTotal, currencyCode),
                        DisplayUnitPriceWithAddons = li.Amount,
                        DisplayLineTotalWithAddons = lineTotal,
                        FormattedDisplayUnitPriceWithAddons = currencyService.FormatAmount(li.Amount, currencyCode),
                        FormattedDisplayLineTotalWithAddons = currencyService.FormatAmount(lineTotal, currencyCode),
                        // Tax info for tax-inclusive display
                        TaxRate = li.TaxRate,
                        IsTaxable = li.IsTaxable,
                        LineItemType = li.LineItemType,
                        DependantLineItemSku = li.DependantLineItemSku,
                        ParentLineItemId = li.GetParentLineItemId()?.ToString(),
                        ImageUrl = imageUrl
                    });
                }
            }
        }

        foreach (var lineItem in lineItems)
        {
            var displayUnitPriceWithAddons = lineItem.GetDisplayLineItemUnitPriceWithAddons(lineItems);
            var displayLineTotalWithAddons = lineItem.GetDisplayLineItemTotalWithAddons(lineItems);
            lineItem.DisplayUnitPriceWithAddons = displayUnitPriceWithAddons;
            lineItem.DisplayLineTotalWithAddons = displayLineTotalWithAddons;
            lineItem.FormattedDisplayUnitPriceWithAddons = currencyService.FormatAmount(displayUnitPriceWithAddons, currencyCode);
            lineItem.FormattedDisplayLineTotalWithAddons = currencyService.FormatAmount(displayLineTotalWithAddons, currencyCode);
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
                    FormattedCost = currencyService.FormatAmount(order.ShippingCost, currencyCode)
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

        var isTaxEstimated = false;
        if (invoice.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.TaxIsEstimated, out var isTaxEstimatedValue))
        {
            var rawEstimated = isTaxEstimatedValue.UnwrapJsonElement();
            if (rawEstimated is bool estimatedBool)
            {
                isTaxEstimated = estimatedBool;
            }
            else if (!string.IsNullOrWhiteSpace(rawEstimated?.ToString()) &&
                     bool.TryParse(rawEstimated.ToString(), out var parsedEstimated))
            {
                isTaxEstimated = parsedEstimated;
            }
        }

        var taxEstimationReason = invoice.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.TaxEstimationReason, out var reasonValue)
            ? reasonValue.UnwrapJsonElement()?.ToString()
            : null;

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
            FormattedSubTotal = currencyService.FormatAmount(invoice.SubTotal, currencyCode),
            Discount = invoice.Discount,
            FormattedDiscount = currencyService.FormatAmount(invoice.Discount, currencyCode),
            Shipping = totalShipping,
            FormattedShipping = currencyService.FormatAmount(totalShipping, currencyCode),
            Tax = invoice.Tax,
            IsTaxEstimated = isTaxEstimated,
            TaxEstimationReason = taxEstimationReason,
            FormattedTax = currencyService.FormatAmount(invoice.Tax, currencyCode),
            Total = invoice.Total,
            FormattedTotal = currencyService.FormatAmount(invoice.Total, currencyCode),
            CurrencySymbol = currencySymbol,

            // Display currency matches store currency (no conversion in core service)
            // Storefront layer can apply currency conversion if needed
            DisplayCurrencyCode = currencyCode,
            DisplayCurrencySymbol = currencySymbol,
            ExchangeRate = 1m,
            DisplaySubTotal = invoice.SubTotal,
            FormattedDisplaySubTotal = currencyService.FormatAmount(invoice.SubTotal, currencyCode),
            DisplayDiscount = invoice.Discount,
            FormattedDisplayDiscount = currencyService.FormatAmount(invoice.Discount, currencyCode),
            DisplayShipping = totalShipping,
            FormattedDisplayShipping = currencyService.FormatAmount(totalShipping, currencyCode),
            DisplayTax = invoice.Tax,
            FormattedDisplayTax = currencyService.FormatAmount(invoice.Tax, currencyCode),
            DisplayTotal = invoice.Total,
            FormattedDisplayTotal = currencyService.FormatAmount(invoice.Total, currencyCode),

            Shipments = shipments,
            PaymentMethod = paymentMethod,

            // Tax-inclusive display support - read from ExtendedData
            EffectiveShippingTaxRate = invoice.ExtendedData.TryGetValue(
                Constants.ExtendedDataKeys.EffectiveShippingTaxRate, out var rateValue)
                ? Convert.ToDecimal(rateValue.UnwrapJsonElement())
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

        var requestBasket = parameters.Basket;
        if (requestBasket == null || requestBasket.Id == Guid.Empty)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = "Basket not found",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        var basketId = requestBasket.Id;

        // Validate digital products require a customer account (reject early instead of at payment)
        var hasDigitalProducts = await BasketHasDigitalProductsAsync(
            new BasketHasDigitalProductsParameters { Basket = requestBasket },
            cancellationToken);

        if (hasDigitalProducts && !requestBasket.CustomerId.HasValue)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = "Digital products require a customer account. Please sign in or create an account.",
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

        const int maxRetries = 3;
        Basket? updatedBasket = null;
        CheckoutSession? session = null;
        OrderGroupingResult? groupingResult = null;
        Dictionary<Guid, string> finalSelections = [];
        decimal combinedShippingTotal = 0;
        var shippingAutoSelected = false;

        for (var attempt = 0; attempt < maxRetries; attempt++)
        {
            using var scope = efCoreScopeProvider.CreateScope();
            var hasEarlyResult = false;

            try
            {
                result.Messages.Clear();

                await scope.ExecuteWithContextAsync<bool>(async db =>
                {
                    updatedBasket = await db.Baskets.FirstOrDefaultAsync(b => b.Id == basketId, cancellationToken);
                    if (updatedBasket == null)
                    {
                        result.Messages.Add(new ResultMessage
                        {
                            Message = "Basket not found",
                            ResultMessageType = ResultMessageType.Error
                        });
                        hasEarlyResult = true;
                        return false;
                    }

                    // Update basket with shipping address for calculation purposes
                    updatedBasket.ShippingAddress = shippingAddress;
                    // Also update billing address country to match (storefront selection takes precedence)
                    updatedBasket.BillingAddress.CountryCode = parameters.CountryCode;
                    updatedBasket.DateUpdated = DateTime.UtcNow;

                    await SyncBasketCurrencyToCountryAsync(updatedBasket, parameters.CountryCode, cancellationToken);

                    // Calculate basket with shipping country
                    await CalculateBasketAsync(new CalculateBasketParameters
                    {
                        Basket = updatedBasket,
                        CountryCode = parameters.CountryCode
                    }, cancellationToken);

                    // Get or create checkout session
                    session = await checkoutSessionService.GetSessionAsync(updatedBasket.Id, cancellationToken);
                    session.ShippingAddress = shippingAddress;

                    // Get order groups with shipping options
                    groupingResult = await GetOrderGroupsAsync(
                        new GetOrderGroupsParameters
                        {
                            Basket = updatedBasket,
                            Session = session
                        },
                        cancellationToken);

                    // Add any grouping errors to basket.Errors so frontend can display item-level shipping errors
                    // (e.g., "Product X cannot be shipped to Country Y")
                    foreach (var error in groupingResult.Errors)
                    {
                        updatedBasket.Errors.Add(new BasketError
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
                    finalSelections = new Dictionary<Guid, string>();
                    combinedShippingTotal = 0;
                    shippingAutoSelected = false;

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
                            Basket = updatedBasket,
                            CountryCode = parameters.CountryCode,
                            ShippingAmountOverride = combinedShippingTotal
                        }, cancellationToken);
                    }

                    // Refresh promotional discounts (automatic + code) after initialization recalculation.
                    if (checkoutDiscountService != null)
                    {
                        var refreshResult = await checkoutDiscountService.Value.RefreshPromotionalDiscountsAsync(
                            updatedBasket,
                            parameters.CountryCode,
                            cancellationToken);
                        updatedBasket = refreshResult.ResultObject ?? updatedBasket;
                        result.Messages.AddRange(refreshResult.Messages
                            .Where(m => m.ResultMessageType != ResultMessageType.Error));
                    }

                    updatedBasket.ConcurrencyStamp = Guid.NewGuid().ToString();
                    await db.SaveChangesAsync(cancellationToken);
                    return true;
                });
                scope.Complete();

                if (hasEarlyResult)
                {
                    return result;
                }

                if (updatedBasket == null || groupingResult == null)
                {
                    if (!result.Messages.Any())
                    {
                        result.Messages.Add(new ResultMessage
                        {
                            Message = "Basket not found",
                            ResultMessageType = ResultMessageType.Error
                        });
                    }
                    return result;
                }

                if (httpContextAccessor.HttpContext != null) httpContextAccessor.HttpContext.Items[BasketCacheKey] = updatedBasket;

                if (groupingResult.Groups.Count > 0)
                {
                    // Save selections to session
                    await checkoutSessionService.SaveShippingSelectionsAsync(new SaveSessionShippingSelectionsParameters
                    {
                        BasketId = updatedBasket.Id,
                        Selections = finalSelections
                    }, cancellationToken);
                }

                // Update checkout session with shipping address
                // Use basket's billing address (which preserves existing fields, only country was updated)
                await checkoutSessionService.SaveAddressesAsync(new SaveSessionAddressesParameters
                {
                    BasketId = updatedBasket.Id,
                    Billing = updatedBasket.BillingAddress,
                    Shipping = shippingAddress,
                    SameAsBilling = false
                }, cancellationToken);

                if (abandonedCheckoutService != null && !string.IsNullOrWhiteSpace(parameters.Email))
                {
                    await abandonedCheckoutService.TrackCheckoutActivityAsync(updatedBasket, parameters.Email, cancellationToken);
                }

                result.ResultObject = new InitializeCheckoutResult
                {
                    Basket = updatedBasket,
                    GroupingResult = groupingResult,
                    AutoSelectedShippingOptions = finalSelections,
                    CombinedShippingTotal = combinedShippingTotal,
                    ShippingAutoSelected = shippingAutoSelected
                };

                return result;
            }
            catch (DbUpdateConcurrencyException ex)
            {
                if (attempt < maxRetries - 1)
                {
                    logger.LogWarning(ex,
                        "Basket {BasketId} was modified concurrently during InitializeCheckoutAsync (attempt {Attempt}). Retrying.",
                        basketId, attempt + 1);
                    continue;
                }

                logger.LogError(ex,
                    "Basket {BasketId} concurrency conflict persisted after {MaxRetries} attempts in InitializeCheckoutAsync.",
                    basketId, maxRetries);
                throw;
            }
            catch (DbUpdateException ex) when (IsTransientSqliteLockException(ex))
            {
                if (attempt < maxRetries - 1)
                {
                    var delay = GetSqliteLockRetryDelay(attempt);
                    logger.LogWarning(ex,
                        "Basket {BasketId} hit SQLite lock during InitializeCheckoutAsync (attempt {Attempt}). Retrying in {DelayMs}ms.",
                        basketId, attempt + 1, delay.TotalMilliseconds);
                    await Task.Delay(delay, cancellationToken);
                    continue;
                }

                logger.LogError(ex,
                    "Basket {BasketId} SQLite lock persisted after {MaxRetries} attempts in InitializeCheckoutAsync.",
                    basketId, maxRetries);
                throw;
            }
        }

        return result;
    }

    private async Task<AddressDto> MapAddressAsync(Locality.Models.Address address)
    {
        // Look up country name from code if not set
        var countryName = address.Country;
        if (string.IsNullOrEmpty(countryName) && !string.IsNullOrEmpty(address.CountryCode))
        {
            countryName = await localityCatalog.TryGetCountryNameAsync(address.CountryCode);
        }

        return new AddressDto
        {
            Name = address.Name,
            Company = address.Company,
            AddressOne = address.AddressOne,
            AddressTwo = address.AddressTwo,
            TownCity = address.TownCity,
            CountyState = string.IsNullOrWhiteSpace(address.CountyState.Name)
                ? address.CountyState.RegionCode
                : address.CountyState.Name,
            RegionCode = address.CountyState.RegionCode,
            PostalCode = address.PostalCode,
            Country = countryName,
            CountryCode = address.CountryCode,
            Email = address.Email,
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

    private static bool IsTransientSqliteLockException(DbUpdateException ex)
    {
        if (ex.InnerException is not SqliteException sqliteEx)
        {
            return false;
        }

        return sqliteEx.SqliteErrorCode is 5 or 6 ||
               sqliteEx.Message.Contains("database is locked", StringComparison.OrdinalIgnoreCase) ||
               sqliteEx.Message.Contains("database table is locked", StringComparison.OrdinalIgnoreCase);
    }

    private static TimeSpan GetSqliteLockRetryDelay(int attempt)
    {
        var baseDelayMs = 100 * (1 << Math.Clamp(attempt, 0, 5));
        var jitterMs = Random.Shared.Next(25, 100);
        return TimeSpan.FromMilliseconds(baseDelayMs + jitterMs);
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
    public async Task<bool> BasketHasDigitalProductsAsync(
        BasketHasDigitalProductsParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var basket = parameters.Basket;
        var productIds = basket.LineItems
            .Where(li => li.ProductId.HasValue)
            .Select(li => li.ProductId!.Value)
            .Distinct()
            .ToList();

        if (productIds.Count == 0) return false;

        var products = await productService.GetProductRootsByIds(productIds, cancellationToken);
        if (products is null || products.Count == 0) return false;
        var productLookup = products.ToDictionary(p => p.Id);

        var hasDigital = false;
        foreach (var lineItem in basket.LineItems.Where(li => li.ProductId.HasValue))
        {
            if (!productLookup.TryGetValue(lineItem.ProductId!.Value, out var product)) continue;

            var isDigital = product.IsDigitalProduct;
            lineItem.ExtendedData["IsDigital"] = isDigital;
            lineItem.ExtendedData[Constants.ExtendedDataKeys.IsPhysicalProduct] = !isDigital;

            if (isDigital)
            {
                hasDigital = true;
            }
        }

        return hasDigital;
    }

    /// <inheritdoc />
    public async Task<CheckoutSessionState?> GetSessionStateAsync(
        GetSessionStateParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var basketId = parameters.BasketId;

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
            orderGroups = await GetOrderGroupsAsync(
                new GetOrderGroupsParameters
                {
                    Basket = basket,
                    Session = session
                },
                cancellationToken);

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
        var currencyCode = basket.Currency ?? _settings.StoreCurrencyCode;

        return new CheckoutSessionState
        {
            SessionId = basketId.ToString(),
            Status = status,
            CreatedAt = basket.DateCreated,
            UpdatedAt = basket.DateUpdated,
            ExpiresAt = session.CreatedAt.AddHours(24),
            Currency = currencyCode,
            LineItems = MapLineItems(basket, currencyCode),
            BillingAddress = MapAddress(basket.BillingAddress),
            ShippingAddress = MapAddress(basket.ShippingAddress),
            ShippingSameAsBilling = session.ShippingSameAsBilling,
            Discounts = MapDiscounts(basket, currencyCode),
            Fulfillment = MapFulfillment(orderGroups, session, currencyCode),
            Totals = MapTotals(basket, currencyCode),
            Messages = messages,
            ContinueUrl = status == ProtocolSessionStatuses.RequiresEscalation
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
            return ProtocolSessionStatuses.Incomplete;
        }

        // Check if line items exist
        if (basket.LineItems.Count == 0)
        {
            return ProtocolSessionStatuses.Incomplete;
        }

        // Check billing address
        if (string.IsNullOrEmpty(basket.BillingAddress.Email) ||
            string.IsNullOrEmpty(basket.BillingAddress.CountryCode))
        {
            return ProtocolSessionStatuses.Incomplete;
        }

        // Check shipping address for physical products
        var hasPhysicalProducts = basket.LineItems.Any(li =>
            li.LineItemType == LineItemType.Product && !IsDigitalProduct(li));

        if (hasPhysicalProducts)
        {
            if (string.IsNullOrEmpty(basket.ShippingAddress.CountryCode))
            {
                return ProtocolSessionStatuses.Incomplete;
            }

            // Check shipping selections
            if (orderGroups?.Groups.Count > 0)
            {
                var allGroupsHaveSelection = orderGroups.Groups
                    .All(g => !string.IsNullOrEmpty(g.SelectedShippingOptionId) ||
                              session.SelectedShippingOptions.ContainsKey(g.GroupId));

                if (!allGroupsHaveSelection)
                {
                    return ProtocolSessionStatuses.Incomplete;
                }
            }
        }

        // All required info collected
        return ProtocolSessionStatuses.ReadyForComplete;
    }

    private static bool IsDigitalProduct(LineItem li)
    {
        if (!li.ExtendedData.TryGetValue("IsDigital", out var isDigital))
        {
            return false;
        }

        var unwrapped = isDigital.UnwrapJsonElement();
        return unwrapped switch
        {
            bool b => b,
            string s => bool.TryParse(s, out var parsed) && parsed,
            _ => false
        };
    }

    private static ShippingAutoSelectStrategy ParseAutoSelectStrategy(string? value) => value switch
    {
        "fastest" => ShippingAutoSelectStrategy.Fastest,
        "cheapest-then-fastest" => ShippingAutoSelectStrategy.CheapestThenFastest,
        _ => ShippingAutoSelectStrategy.Cheapest
    };

    private static string? BuildAddonSelectionSignature(IReadOnlyList<Merchello.Core.Shared.Dtos.AddonSelectionDto> addons)
    {
        if (addons.Count == 0)
        {
            return null;
        }

        return string.Join("|", addons
            .OrderBy(x => x.OptionId)
            .ThenBy(x => x.ValueId)
            .Select(x => $"{x.OptionId:N}:{x.ValueId:N}"));
    }

    private static (List<Merchello.Core.Shared.Dtos.AddonSelectionDto> NormalizedSelections, string? ErrorMessage) ValidateAddonSelections(
        IReadOnlyCollection<Merchello.Core.Products.Models.ProductOption> addonOptions,
        IReadOnlyList<Merchello.Core.Shared.Dtos.AddonSelectionDto> selectedAddons)
    {
        var normalizedSelections = selectedAddons
            .GroupBy(a => new { a.OptionId, a.ValueId })
            .Select(g => g.First())
            .ToList();

        if (normalizedSelections.Count == 0)
        {
            var missingRequiredWithoutSelections = addonOptions
                .Where(o => o.IsRequired)
                .Select(o => string.IsNullOrWhiteSpace(o.Name) ? "Required add-on" : o.Name!.Trim())
                .ToList();

            if (missingRequiredWithoutSelections.Count > 0)
            {
                return ([], $"Please select required add-on(s): {string.Join(", ", missingRequiredWithoutSelections)}.");
            }

            return ([], null);
        }

        if (addonOptions.Count == 0)
        {
            return ([], "This product does not support add-ons.");
        }

        var optionLookup = addonOptions.ToDictionary(o => o.Id);
        var selectedByOption = normalizedSelections
            .GroupBy(s => s.OptionId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var missingRequiredOptions = addonOptions
            .Where(o => o.IsRequired && !selectedByOption.ContainsKey(o.Id))
            .Select(o => string.IsNullOrWhiteSpace(o.Name) ? "Required add-on" : o.Name!.Trim())
            .ToList();

        if (missingRequiredOptions.Count > 0)
        {
            return ([], $"Please select required add-on(s): {string.Join(", ", missingRequiredOptions)}.");
        }

        foreach (var (optionId, selectionsForOption) in selectedByOption)
        {
            if (!optionLookup.TryGetValue(optionId, out var option))
            {
                return ([], "One or more selected add-ons are invalid for this product.");
            }

            if (!option.IsMultiSelect && selectionsForOption.Count > 1)
            {
                var optionName = string.IsNullOrWhiteSpace(option.Name) ? "This add-on option" : option.Name;
                return ([], $"{optionName} only allows one selection.");
            }

            var validValueIds = option.ProductOptionValues
                .Select(v => v.Id)
                .ToHashSet();

            if (selectionsForOption.Any(selection => !validValueIds.Contains(selection.ValueId)))
            {
                var optionName = string.IsNullOrWhiteSpace(option.Name) ? "An add-on option" : option.Name;
                return ([], $"One or more selected values are invalid for {optionName}.");
            }
        }

        return (normalizedSelections, null);
    }

    private IReadOnlyList<CheckoutLineItemState> MapLineItems(Basket basket, string currencyCode)
    {
        return basket.LineItems
            .Where(li => li.LineItemType == LineItemType.Product)
            .Select(li => new CheckoutLineItemState
            {
                LineItemId = li.Id.ToString(),
                ProductId = li.ProductId?.ToString(),
                VariantId = li.ExtendedData.TryGetValue("VariantId", out var vid)
                    ? vid.UnwrapJsonElement()?.ToString()
                    : null,
                Sku = li.Sku ?? string.Empty,
                Name = li.Name ?? string.Empty,
                Description = li.ExtendedData.TryGetValue("Description", out var desc)
                    ? desc.UnwrapJsonElement()?.ToString()
                    : null,
                Quantity = li.Quantity,
                UnitPrice = ToMinorUnits(li.Amount, currencyCode),
                LineTotal = ToMinorUnits(li.Amount * li.Quantity, currencyCode),
                DiscountAmount = 0, // Line-level discounts would need additional calculation
                TaxAmount = li.IsTaxable ? ToMinorUnits(li.Amount * li.Quantity * li.TaxRate / 100, currencyCode) : 0,
                FinalTotal = ToMinorUnits(li.Amount * li.Quantity, currencyCode),
                RequiresShipping = !IsDigitalProduct(li),
                ImageUrl = li.ExtendedData.TryGetValue("ImageUrl", out var img)
                    ? img.UnwrapJsonElement()?.ToString()
                    : null,
                ProductUrl = li.ExtendedData.TryGetValue("ProductUrl", out var url)
                    ? url.UnwrapJsonElement()?.ToString()
                    : null,
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
                    Name = name.UnwrapJsonElement()?.ToString() ?? string.Empty,
                    Value = value.UnwrapJsonElement()?.ToString() ?? string.Empty
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
            AddressOne = address.AddressOne,
            AddressTwo = address.AddressTwo,
            TownCity = address.TownCity,
            CountyState = address.CountyState.Name,
            RegionCode = address.CountyState.RegionCode,
            PostalCode = address.PostalCode,
            Country = address.Country,
            CountryCode = address.CountryCode,
            Phone = address.Phone,
            Email = address.Email
        };
    }

    private IReadOnlyList<CheckoutDiscountState> MapDiscounts(Basket basket, string currencyCode)
    {
        return basket.LineItems
            .Where(li => li.LineItemType == LineItemType.Discount)
            .Select(li => new CheckoutDiscountState
            {
                DiscountId = li.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountId, out var discountIdObj) &&
                             Guid.TryParse(discountIdObj.UnwrapJsonElement()?.ToString(), out var parsedDiscountId)
                    ? parsedDiscountId.ToString()
                    : li.Id.ToString(),
                Code = li.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountCode, out var codeObj)
                    ? codeObj.UnwrapJsonElement()?.ToString()
                    : null,
                Name = li.Name ?? "Discount",
                Type = MapDiscountType(
                    li.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountValueType, out var valueTypeObj)
                        ? valueTypeObj.UnwrapJsonElement()?.ToString()
                        : null,
                    li.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountCategory, out var categoryObj)
                        ? categoryObj.UnwrapJsonElement()?.ToString()
                        : null),
                Amount = ToMinorUnits(Math.Abs(li.Amount * li.Quantity), currencyCode),
                IsAutomatic = !(li.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountCode, out var codeValue) &&
                                !string.IsNullOrWhiteSpace(codeValue.UnwrapJsonElement()?.ToString())),
                Method = ProtocolDiscountAllocationMethods.Across
            })
            .ToList();
    }

    private static string MapDiscountType(string? valueType, string? category)
    {
        var normalizedCategory = category?.Replace("_", string.Empty, StringComparison.Ordinal)
            .ToLowerInvariant();
        if (normalizedCategory is "freeshipping")
        {
            return ProtocolDiscountTypes.FreeShipping;
        }

        if (normalizedCategory is "buyxgety")
        {
            return ProtocolDiscountTypes.BuyXGetY;
        }

        return valueType?.ToLowerInvariant() switch
        {
            "percentage" => ProtocolDiscountTypes.Percentage,
            _ => ProtocolDiscountTypes.FixedAmount
        };
    }

    private CheckoutFulfillmentState? MapFulfillment(
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
                    Type = ProtocolFulfillmentTypes.Shipping,
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
                            Amount = ToMinorUnits(opt.Cost, currency),
                            Currency = currency,
                            EstimatedDeliveryDays = opt.DaysTo > 0 ? opt.DaysTo : null
                        }).ToList()
                    }).ToList()
                }
            ]
        };
    }

    private CheckoutTotalsState MapTotals(Basket basket, string currency)
    {
        var breakdown = new List<CheckoutTotalBreakdown>
        {
            new() { Label = "Subtotal", Amount = ToMinorUnits(basket.SubTotal, currency), Type = "subtotal" }
        };

        if (basket.Discount > 0)
        {
            breakdown.Add(new CheckoutTotalBreakdown { Label = "Discount", Amount = -ToMinorUnits(basket.Discount, currency), Type = "discount" });
        }

        if (basket.Shipping > 0)
        {
            breakdown.Add(new CheckoutTotalBreakdown { Label = "Shipping", Amount = ToMinorUnits(basket.Shipping, currency), Type = "fulfillment" });
        }

        if (basket.Tax > 0)
        {
            breakdown.Add(new CheckoutTotalBreakdown { Label = "Tax", Amount = ToMinorUnits(basket.Tax, currency), Type = "tax" });
        }

        breakdown.Add(new CheckoutTotalBreakdown { Label = "Total", Amount = ToMinorUnits(basket.Total, currency), Type = "total" });

        return new CheckoutTotalsState
        {
            Subtotal = ToMinorUnits(basket.SubTotal, currency),
            ItemsDiscount = 0,
            Discount = ToMinorUnits(basket.Discount, currency),
            Fulfillment = ToMinorUnits(basket.Shipping, currency),
            Tax = ToMinorUnits(basket.Tax, currency),
            Total = ToMinorUnits(basket.Total, currency),
            Currency = currency,
            Breakdown = breakdown
        };
    }

    private static IReadOnlyList<CheckoutMessageState> MapProtocolMessages(Basket basket)
    {
        return basket.Errors
            .Select(e => new CheckoutMessageState
            {
                Type = ProtocolMessageTypes.Error,
                Code = e.IsShippingError
                    ? ProtocolMessageCodes.ShippingUnavailable
                    : (e.RelatedLineItemId.HasValue
                        ? ProtocolMessageCodes.OutOfStock
                        : ProtocolMessageCodes.Missing),
                Path = e.RelatedLineItemId.HasValue
                    ? $"$.line_items[?(@.id=='{e.RelatedLineItemId}')]"
                    : (e.IsShippingError ? "$.fulfillment" : null),
                Content = e.Message ?? "An error occurred",
                Severity = ProtocolMessageSeverities.RequiresBuyerInput
            })
            .ToList();
    }

    /// <inheritdoc />
    public async Task<Basket?> GetBasketByIdAsync(
        GetBasketByIdParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var basketId = parameters.BasketId;

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
            ShippingAddress = addressFactory.CreateCountryOnly(parameters.CountryCode, parameters.RegionCode)
        };

        // Get order groups with shipping options
        var groupingResult = await GetOrderGroupsAsync(
            new GetOrderGroupsParameters
            {
                Basket = basket,
                Session = session
            },
            cancellationToken);
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
    private long ToMinorUnits(decimal amount, string currencyCode) => currencyService.ToMinorUnits(amount, currencyCode);
}


