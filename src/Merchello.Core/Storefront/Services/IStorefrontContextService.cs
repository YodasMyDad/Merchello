using Merchello.Core.Accounting.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Storefront.Models;
using Merchello.Core.Storefront.Services.Parameters;

namespace Merchello.Core.Storefront.Services;

/// <summary>
/// Centralized service providing location-aware context for all storefront operations.
/// Handles customer shipping location preferences and location-aware stock/availability calculations.
/// </summary>
public interface IStorefrontContextService
{
    /// <summary>
    /// Gets the current customer's shipping location from cookie, settings, or fallback.
    /// </summary>
    Task<ShippingLocation> GetShippingLocationAsync(CancellationToken ct = default);

    /// <summary>
    /// Sets the customer's preferred shipping country (writes cookie).
    /// Also automatically updates the currency based on the country.
    /// </summary>
    void SetShippingCountry(string countryCode, string? regionCode = null);

    /// <summary>
    /// Gets the current customer's currency from cookie, derived from country, or store default.
    /// </summary>
    Task<StorefrontCurrency> GetCurrencyAsync(CancellationToken ct = default);

    /// <summary>
    /// Sets the customer's preferred currency (writes cookie).
    /// </summary>
    void SetCurrency(string currencyCode);

    /// <summary>
    /// Gets stock available to the current customer's location.
    /// Only counts stock from warehouses that can ship to their country/region.
    /// </summary>
    Task<int> GetAvailableStockAsync(Product product, CancellationToken ct = default);

    /// <summary>
    /// Gets stock available for a specific location.
    /// Only counts stock from warehouses that can ship to the specified country/region.
    /// </summary>
    Task<int> GetAvailableStockForLocationAsync(GetStockForLocationParameters parameters, CancellationToken ct = default);

    /// <summary>
    /// Checks if a product can ship to the current customer's location.
    /// </summary>
    Task<bool> CanShipToCustomerAsync(Product product, CancellationToken ct = default);

    /// <summary>
    /// Gets full availability info for a product at the current location.
    /// </summary>
    Task<ProductLocationAvailability> GetProductAvailabilityAsync(
        Product product,
        int quantity = 1,
        CancellationToken ct = default);

    /// <summary>
    /// Gets full availability info for a product at a specific location.
    /// </summary>
    Task<ProductLocationAvailability> GetProductAvailabilityForLocationAsync(
        ProductAvailabilityParameters parameters,
        CancellationToken ct = default);

    /// <summary>
    /// Gets the exchange rate from store currency to customer's selected currency.
    /// Returns 1.0 if same currency or rate unavailable.
    /// </summary>
    Task<decimal> GetExchangeRateAsync(CancellationToken ct = default);

    /// <summary>
    /// Converts a price from store currency to customer's selected currency.
    /// </summary>
    Task<decimal> ConvertToCustomerCurrencyAsync(decimal amount, CancellationToken ct = default);

    /// <summary>
    /// Gets full currency context for display (code, symbol, exchange rate).
    /// </summary>
    Task<StorefrontCurrencyContext> GetCurrencyContextAsync(CancellationToken ct = default);

    /// <summary>
    /// Gets complete display context including currency and tax-inclusive settings.
    /// Use this for product display price calculations.
    /// </summary>
    Task<StorefrontDisplayContext> GetDisplayContextAsync(CancellationToken ct = default);

    /// <summary>
    /// Gets availability info for all items in the current basket at a specific location.
    /// Checks if each item can ship to the location and has sufficient stock.
    /// </summary>
    Task<BasketLocationAvailability> GetBasketAvailabilityAsync(
        string? countryCode = null,
        string? regionCode = null,
        CancellationToken ct = default);

    /// <summary>
    /// Gets availability info for provided line items at a specific location.
    /// Use this overload when you already have the basket loaded to avoid duplicate DB calls.
    /// </summary>
    Task<BasketLocationAvailability> GetBasketAvailabilityAsync(
        IReadOnlyList<LineItem> lineItems,
        string? countryCode = null,
        string? regionCode = null,
        CancellationToken ct = default);
}
