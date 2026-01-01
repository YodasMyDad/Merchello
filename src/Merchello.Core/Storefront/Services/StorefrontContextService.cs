using Merchello.Core.Locality.Services.Interfaces;
using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Models;
using Merchello.Core.Storefront.Models;
using Merchello.Core.Warehouses.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace Merchello.Core.Storefront.Services;

public class StorefrontContextService(
    IHttpContextAccessor httpContextAccessor,
    IOptions<MerchelloSettings> settings,
    ILocationsService locationsService,
    ILocalityCatalog localityCatalog) : IStorefrontContextService
{
    private const string CountryCookieName = "Merchello.ShippingCountry";
    private const string RegionCookieName = "Merchello.ShippingRegion";
    private const int CookieExpiryDays = 30;
    private const string FallbackCountryCode = "US";

    private readonly MerchelloSettings _settings = settings.Value;

    public async Task<ShippingLocation> GetShippingLocationAsync(CancellationToken ct = default)
    {
        var httpContext = httpContextAccessor.HttpContext;
        string? countryCode = null;
        string? regionCode = null;

        // Try to read from cookie
        if (httpContext?.Request.Cookies.TryGetValue(CountryCookieName, out var cookieCountry) == true)
        {
            countryCode = cookieCountry;
            httpContext.Request.Cookies.TryGetValue(RegionCookieName, out regionCode);
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
            countryCode = availableCountryCodes.Contains(FallbackCountryCode)
                ? FallbackCountryCode
                : availableCountries.FirstOrDefault()?.Code ?? FallbackCountryCode;
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

        httpContext.Response.Cookies.Append(CountryCookieName, countryCode.ToUpperInvariant(), cookieOptions);

        if (!string.IsNullOrWhiteSpace(regionCode))
        {
            httpContext.Response.Cookies.Append(RegionCookieName, regionCode.ToUpperInvariant(), cookieOptions);
        }
        else
        {
            httpContext.Response.Cookies.Delete(RegionCookieName);
        }
    }

    public async Task<int> GetAvailableStockAsync(Product product, CancellationToken ct = default)
    {
        var location = await GetShippingLocationAsync(ct);
        return await GetAvailableStockForLocationAsync(product, location.CountryCode, location.RegionCode, ct);
    }

    public Task<int> GetAvailableStockForLocationAsync(Product product, string countryCode, string? regionCode = null, CancellationToken ct = default)
    {
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
        return await GetProductAvailabilityForLocationAsync(product, location.CountryCode, location.RegionCode, quantity, ct);
    }

    public async Task<ProductLocationAvailability> GetProductAvailabilityForLocationAsync(
        Product product,
        string countryCode,
        string? regionCode = null,
        int quantity = 1,
        CancellationToken ct = default)
    {
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

        var availableStock = await GetAvailableStockForLocationAsync(product, countryCode, regionCode, ct);
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
        // Check if any warehouse assigned to this product can serve the location
        if (product.ProductWarehouses != null && product.ProductWarehouses.Count > 0)
        {
            return product.ProductWarehouses.Any(pw =>
                pw.Warehouse?.CanServeRegion(countryCode, regionCode) == true);
        }

        // Fall back to root product warehouses
        if (product.ProductRoot?.ProductRootWarehouses != null)
        {
            return product.ProductRoot.ProductRootWarehouses.Any(prw =>
                prw.Warehouse?.CanServeRegion(countryCode, regionCode) == true);
        }

        // No warehouse restrictions - can ship anywhere
        return true;
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
}
