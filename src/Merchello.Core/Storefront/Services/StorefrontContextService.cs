using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.ExchangeRates.Services.Interfaces;
using Merchello.Core.Locality.Services.Interfaces;
using Merchello.Core.Products.Extensions;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Products.Services.Parameters;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Storefront.Models;
using Merchello.Core.Storefront.Services.Parameters;
using Merchello.Core.Warehouses.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace Merchello.Core.Storefront.Services;

public class StorefrontContextService(
    IHttpContextAccessor httpContextAccessor,
    IOptions<MerchelloSettings> settings,
    ILocationsService locationsService,
    ILocalityCatalog localityCatalog,
    ICurrencyService currencyService,
    ICountryCurrencyMappingService countryCurrencyMapping,
    IExchangeRateCache exchangeRateCache,
    ICheckoutService checkoutService,
    IProductService productService) : IStorefrontContextService
{
    private const int CookieExpiryDays = 30;

    private readonly MerchelloSettings _settings = settings.Value;

    public async Task<ShippingLocation> GetShippingLocationAsync(CancellationToken ct = default)
    {
        var httpContext = httpContextAccessor.HttpContext;
        string? countryCode = null;
        string? regionCode = null;

        // Try to read from cookie
        if (httpContext?.Request.Cookies.TryGetValue(Constants.Cookies.ShippingCountry, out var cookieCountry) == true)
        {
            countryCode = cookieCountry;
            httpContext.Request.Cookies.TryGetValue(Constants.Cookies.ShippingRegion, out regionCode);
        }

        // Validate country code against available countries
        var availableCountries = await locationsService.GetAvailableCountriesAsync(ct);
        var availableCountryCodes = availableCountries.Select(c => c.Code).ToHashSet(StringComparer.OrdinalIgnoreCase);

        // If cookie country is invalid, try settings default
        if (string.IsNullOrWhiteSpace(countryCode) || !availableCountryCodes.Contains(countryCode))
        {
            countryCode = _settings.DefaultShippingCountry;
        }

        // If settings default is invalid, use fallback
        if (string.IsNullOrWhiteSpace(countryCode) || !availableCountryCodes.Contains(countryCode))
        {
            countryCode = availableCountryCodes.Contains(Constants.FallbackCountryCode)
                ? Constants.FallbackCountryCode
                : availableCountries.FirstOrDefault()?.Code ?? Constants.FallbackCountryCode;
        }

        // Get country name
        var countries = await localityCatalog.GetCountriesAsync(ct);
        var country = countries.FirstOrDefault(c => c.Code.Equals(countryCode, StringComparison.OrdinalIgnoreCase));
        var countryName = country?.Name ?? countryCode;

        // Validate region if provided
        string? regionName = null;
        if (!string.IsNullOrWhiteSpace(regionCode))
        {
            var regions = await localityCatalog.GetRegionsAsync(countryCode, ct);
            var region = regions.FirstOrDefault(r => r.RegionCode.Equals(regionCode, StringComparison.OrdinalIgnoreCase));
            if (region != null)
            {
                regionName = region.Name;
            }
            else
            {
                regionCode = null; // Invalid region, clear it
            }
        }

        return new ShippingLocation(countryCode.ToUpperInvariant(), countryName, regionCode?.ToUpperInvariant(), regionName);
    }

    public void SetShippingCountry(string countryCode, string? regionCode = null)
    {
        var httpContext = httpContextAccessor.HttpContext;
        if (httpContext == null) return;

        var cookieOptions = new CookieOptions
        {
            Expires = DateTimeOffset.UtcNow.AddDays(CookieExpiryDays),
            HttpOnly = false, // Allow JS to read for dropdown display
            Secure = true,
            SameSite = SameSiteMode.Lax
        };

        httpContext.Response.Cookies.Append(Constants.Cookies.ShippingCountry, countryCode.ToUpperInvariant(), cookieOptions);

        if (!string.IsNullOrWhiteSpace(regionCode))
        {
            httpContext.Response.Cookies.Append(Constants.Cookies.ShippingRegion, regionCode.ToUpperInvariant(), cookieOptions);
        }
        else
        {
            httpContext.Response.Cookies.Delete(Constants.Cookies.ShippingRegion);
        }

        // Automatically update currency based on the new country
        var currencyCode = countryCurrencyMapping.GetCurrencyForCountry(countryCode);
        SetCurrency(currencyCode);
    }

    public Task<StorefrontCurrency> GetCurrencyAsync(CancellationToken ct = default)
    {
        var httpContext = httpContextAccessor.HttpContext;
        string? currencyCode = null;

        // Try to read from cookie first
        if (httpContext?.Request.Cookies.TryGetValue(Constants.Cookies.Currency, out var cookieCurrency) == true
            && !string.IsNullOrWhiteSpace(cookieCurrency))
        {
            currencyCode = cookieCurrency;
        }

        // Fallback to store default if no cookie
        if (string.IsNullOrWhiteSpace(currencyCode))
        {
            currencyCode = _settings.StoreCurrencyCode;
        }

        var currencyInfo = currencyService.GetCurrency(currencyCode);
        return Task.FromResult(new StorefrontCurrency(
            currencyInfo.Code,
            currencyInfo.Symbol,
            currencyInfo.DecimalPlaces));
    }

    public void SetCurrency(string currencyCode)
    {
        var httpContext = httpContextAccessor.HttpContext;
        if (httpContext == null) return;

        var cookieOptions = new CookieOptions
        {
            Expires = DateTimeOffset.UtcNow.AddDays(CookieExpiryDays),
            HttpOnly = false, // Allow JS to read for display
            Secure = true,
            SameSite = SameSiteMode.Lax
        };

        httpContext.Response.Cookies.Append(Constants.Cookies.Currency, currencyCode.ToUpperInvariant(), cookieOptions);
    }

    public async Task<int> GetAvailableStockAsync(Product product, CancellationToken ct = default)
    {
        var location = await GetShippingLocationAsync(ct);
        return await GetAvailableStockForLocationAsync(new GetStockForLocationParameters
        {
            Product = product,
            CountryCode = location.CountryCode,
            RegionCode = location.RegionCode
        }, ct);
    }

    public Task<int> GetAvailableStockForLocationAsync(GetStockForLocationParameters parameters, CancellationToken ct = default)
    {
        var product = parameters.Product;
        var countryCode = parameters.CountryCode;
        var regionCode = parameters.RegionCode;

        if (product.ProductWarehouses == null || product.ProductWarehouses.Count == 0)
        {
            // No warehouse assignments - use the product's root warehouse assignments
            return Task.FromResult(CalculateStockFromRootWarehouses(product, countryCode, regionCode));
        }

        var totalStock = 0;
        var hasUnlimitedStock = false;

        foreach (var pw in product.ProductWarehouses)
        {
            if (pw.Warehouse == null) continue;

            // Check if this warehouse can serve the customer's location
            if (!pw.Warehouse.CanServeRegion(countryCode, regionCode)) continue;

            if (!pw.TrackStock)
            {
                hasUnlimitedStock = true;
                break;
            }

            var availableStock = pw.Stock - pw.ReservedStock;
            if (availableStock > 0)
            {
                totalStock += availableStock;
            }
        }

        return Task.FromResult(hasUnlimitedStock ? int.MaxValue : totalStock);
    }

    public async Task<bool> CanShipToCustomerAsync(Product product, CancellationToken ct = default)
    {
        var location = await GetShippingLocationAsync(ct);
        return CanShipToLocation(product, location.CountryCode, location.RegionCode);
    }

    public async Task<ProductLocationAvailability> GetProductAvailabilityAsync(
        Product product,
        int quantity = 1,
        CancellationToken ct = default)
    {
        var location = await GetShippingLocationAsync(ct);
        return await GetProductAvailabilityForLocationAsync(new ProductAvailabilityParameters
        {
            Product = product,
            CountryCode = location.CountryCode,
            RegionCode = location.RegionCode,
            Quantity = quantity
        }, ct);
    }

    public async Task<ProductLocationAvailability> GetProductAvailabilityForLocationAsync(
        ProductAvailabilityParameters parameters,
        CancellationToken ct = default)
    {
        var product = parameters.Product;
        var countryCode = parameters.CountryCode;
        var regionCode = parameters.RegionCode;
        var quantity = parameters.Quantity;

        var canShipToLocation = CanShipToLocation(product, countryCode, regionCode);

        if (!canShipToLocation)
        {
            // Get country name for message
            var countries = await localityCatalog.GetCountriesAsync(ct);
            var country = countries.FirstOrDefault(c => c.Code.Equals(countryCode, StringComparison.OrdinalIgnoreCase));
            var countryName = country?.Name ?? countryCode;

            return new ProductLocationAvailability(
                CanShipToLocation: false,
                HasStock: false,
                AvailableStock: 0,
                StatusMessage: $"Not available in {countryName}",
                ShowStockLevels: _settings.ShowStockLevels);
        }

        var availableStock = await GetAvailableStockForLocationAsync(new GetStockForLocationParameters
        {
            Product = product,
            CountryCode = countryCode,
            RegionCode = regionCode
        }, ct);
        var hasUnlimitedStock = availableStock == int.MaxValue;
        var hasStock = hasUnlimitedStock || availableStock >= quantity;

        string statusMessage;
        if (hasUnlimitedStock)
        {
            statusMessage = "In Stock";
        }
        else if (availableStock <= 0)
        {
            statusMessage = "Out of Stock";
        }
        else if (availableStock < quantity)
        {
            statusMessage = $"Only {availableStock} available";
        }
        else
        {
            statusMessage = "In Stock";
        }

        return new ProductLocationAvailability(
            CanShipToLocation: true,
            HasStock: hasStock,
            AvailableStock: hasUnlimitedStock ? 0 : availableStock, // Don't expose int.MaxValue
            StatusMessage: statusMessage,
            ShowStockLevels: _settings.ShowStockLevels);
    }

    private bool CanShipToLocation(Product product, string countryCode, string? regionCode)
    {
        // First check: Can any warehouse serve the location?
        bool warehouseCanServe;

        if (product.ProductWarehouses != null && product.ProductWarehouses.Count > 0)
        {
            warehouseCanServe = product.ProductWarehouses.Any(pw =>
                pw.Warehouse?.CanServeRegion(countryCode, regionCode) == true);
        }
        else if (product.ProductRoot?.ProductRootWarehouses != null &&
                 product.ProductRoot.ProductRootWarehouses.Count > 0)
        {
            warehouseCanServe = product.ProductRoot.ProductRootWarehouses.Any(prw =>
                prw.Warehouse?.CanServeRegion(countryCode, regionCode) == true);
        }
        else
        {
            // No warehouse restrictions - can ship anywhere (warehouse-wise)
            warehouseCanServe = true;
        }

        if (!warehouseCanServe)
        {
            return false;
        }

        // Second check: Are shipping options with costs configured for this destination?
        // GetValidShippingOptionsForCountry checks both warehouse service regions AND shipping costs
        var validShippingOptions = product.GetValidShippingOptionsForCountry(countryCode, regionCode);

        if (validShippingOptions.Any())
        {
            return true;
        }

        // Check if shipping options are loaded but none can ship to this destination
        var allowedOptions = product.GetAllowedShippingOptions();

        if (allowedOptions.Any())
        {
            // Shipping options exist but none can ship to this destination
            return false;
        }

        // No shipping options configured/loaded on product - fall back to warehouse check only
        // This allows the system to work even when shipping options aren't loaded
        return warehouseCanServe;
    }

    private static int CalculateStockFromRootWarehouses(Product product, string countryCode, string? regionCode)
    {
        // If product has no ProductWarehouses, we need to check root warehouses
        // But root warehouses don't have per-variant stock, so we return unlimited or 0
        if (product.ProductRoot?.ProductRootWarehouses == null || product.ProductRoot.ProductRootWarehouses.Count == 0)
        {
            return int.MaxValue; // No restrictions
        }

        var canServe = product.ProductRoot.ProductRootWarehouses.Any(prw =>
            prw.Warehouse?.CanServeRegion(countryCode, regionCode) == true);

        return canServe ? int.MaxValue : 0;
    }

    public async Task<decimal> GetExchangeRateAsync(CancellationToken ct = default)
    {
        var customerCurrency = await GetCurrencyAsync(ct);
        return await GetExchangeRateForCurrencyAsync(customerCurrency.CurrencyCode, ct);
    }

    public async Task<decimal> ConvertToCustomerCurrencyAsync(decimal amount, CancellationToken ct = default)
    {
        var customerCurrency = await GetCurrencyAsync(ct);
        var rate = await GetExchangeRateForCurrencyAsync(customerCurrency.CurrencyCode, ct);

        if (rate == 1.0m)
        {
            return amount;
        }

        var converted = amount * rate;

        // Round to the appropriate decimal places for the customer's currency
        return currencyService.Round(converted, customerCurrency.CurrencyCode);
    }

    public async Task<StorefrontCurrencyContext> GetCurrencyContextAsync(CancellationToken ct = default)
    {
        var customerCurrency = await GetCurrencyAsync(ct);
        var exchangeRate = await GetExchangeRateForCurrencyAsync(customerCurrency.CurrencyCode, ct);

        return new StorefrontCurrencyContext(
            customerCurrency.CurrencyCode,
            customerCurrency.CurrencySymbol,
            customerCurrency.DecimalPlaces,
            exchangeRate,
            _settings.StoreCurrencyCode);
    }

    public async Task<StorefrontDisplayContext> GetDisplayContextAsync(CancellationToken ct = default)
    {
        var currencyContext = await GetCurrencyContextAsync(ct);
        var shippingLocation = await GetShippingLocationAsync(ct);

        return new StorefrontDisplayContext(
            currencyContext.CurrencyCode,
            currencyContext.CurrencySymbol,
            currencyContext.DecimalPlaces,
            currencyContext.ExchangeRate,
            currencyContext.StoreCurrencyCode,
            _settings.DisplayPricesIncTax,
            shippingLocation.CountryCode,
            shippingLocation.RegionCode);
    }

    /// <summary>
    /// Gets the exchange rate from store currency to the specified target currency.
    /// </summary>
    private async Task<decimal> GetExchangeRateForCurrencyAsync(string targetCurrencyCode, CancellationToken ct)
    {
        var storeCurrencyCode = _settings.StoreCurrencyCode;

        // Same currency - no conversion needed
        if (targetCurrencyCode.Equals(storeCurrencyCode, StringComparison.OrdinalIgnoreCase))
        {
            return 1.0m;
        }

        // Fetch exchange rate from cache
        var rate = await exchangeRateCache.GetRateAsync(storeCurrencyCode, targetCurrencyCode, ct);

        // Return rate if available, otherwise 1.0 (no conversion)
        return rate ?? 1.0m;
    }

    public async Task<BasketLocationAvailability> GetBasketAvailabilityAsync(
        string? countryCode = null,
        string? regionCode = null,
        CancellationToken ct = default)
    {
        var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);

        if (basket == null || basket.LineItems.Count == 0)
        {
            return new BasketLocationAvailability(AllItemsAvailable: true, Items: []);
        }

        return await GetBasketAvailabilityAsync(basket.LineItems, countryCode, regionCode, ct);
    }

    public async Task<BasketLocationAvailability> GetBasketAvailabilityAsync(
        IReadOnlyList<LineItem> lineItems,
        string? countryCode = null,
        string? regionCode = null,
        CancellationToken ct = default)
    {
        if (lineItems.Count == 0)
        {
            return new BasketLocationAvailability(AllItemsAvailable: true, Items: []);
        }

        // Get the location to check - use provided or current customer location
        var location = string.IsNullOrWhiteSpace(countryCode)
            ? await GetShippingLocationAsync(ct)
            : new ShippingLocation(countryCode, countryCode, regionCode, null);

        List<BasketItemLocationAvailability> items = [];
        var allAvailable = true;

        foreach (var lineItem in lineItems.Where(li => li.ProductId.HasValue))
        {
            var product = await productService.GetProduct(new GetProductParameters
            {
                ProductId = lineItem.ProductId!.Value,
                IncludeProductRoot = true,
                IncludeProductWarehouses = true,
                IncludeProductRootWarehouses = true,
                NoTracking = true
            }, ct);

            if (product == null)
            {
                items.Add(new BasketItemLocationAvailability(
                    LineItemId: lineItem.Id,
                    ProductId: lineItem.ProductId!.Value,
                    CanShipToLocation: false,
                    HasStock: false,
                    StatusMessage: "Product not found"));
                allAvailable = false;
                continue;
            }

            var availability = await GetProductAvailabilityForLocationAsync(new ProductAvailabilityParameters
            {
                Product = product,
                CountryCode = location.CountryCode,
                RegionCode = location.RegionCode,
                Quantity = lineItem.Quantity
            }, ct);

            var isAvailable = availability.CanShipToLocation && availability.HasStock;
            if (!isAvailable) allAvailable = false;

            items.Add(new BasketItemLocationAvailability(
                LineItemId: lineItem.Id,
                ProductId: lineItem.ProductId!.Value,
                CanShipToLocation: availability.CanShipToLocation,
                HasStock: availability.HasStock,
                StatusMessage: availability.StatusMessage));
        }

        return new BasketLocationAvailability(AllItemsAvailable: allAvailable, Items: items);
    }
}
