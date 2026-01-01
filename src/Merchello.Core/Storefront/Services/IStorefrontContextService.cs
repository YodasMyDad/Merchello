using Merchello.Core.Products.Models;
using Merchello.Core.Storefront.Models;

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
    /// </summary>
    void SetShippingCountry(string countryCode, string? regionCode = null);

    /// <summary>
    /// Gets stock available to the current customer's location.
    /// Only counts stock from warehouses that can ship to their country/region.
    /// </summary>
    Task<int> GetAvailableStockAsync(Product product, CancellationToken ct = default);

    /// <summary>
    /// Gets stock available for a specific location.
    /// Only counts stock from warehouses that can ship to the specified country/region.
    /// </summary>
    Task<int> GetAvailableStockForLocationAsync(Product product, string countryCode, string? regionCode = null, CancellationToken ct = default);

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
        Product product,
        string countryCode,
        string? regionCode = null,
        int quantity = 1,
        CancellationToken ct = default);
}
