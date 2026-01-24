using Merchello.Core.Checkout.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Shipping.Providers;

namespace Merchello.Core.Shipping.Services.Interfaces;

public interface IShippingQuoteService
{
    /// <summary>
    /// Gets shipping quotes for a basket (basket-level, may involve multiple warehouses).
    /// </summary>
    Task<IReadOnlyCollection<ShippingRateQuote>> GetQuotesAsync(
        Basket basket,
        string countryCode,
        string? stateOrProvinceCode = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets shipping quotes for a specific warehouse (per-warehouse quotes for order grouping).
    /// Used by DefaultOrderGroupingStrategy to fetch rates from dynamic providers.
    /// </summary>
    /// <param name="warehouseId">The warehouse ID (used for cache key and provider config lookup)</param>
    /// <param name="warehouseAddress">The warehouse address (origin for carrier API calls)</param>
    /// <param name="packages">Package dimensions and weights for the items in this group</param>
    /// <param name="destinationCountry">Customer's country code</param>
    /// <param name="destinationState">Customer's state/province code</param>
    /// <param name="destinationPostal">Customer's postal code</param>
    /// <param name="currency">The currency code for the rates</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Quotes from all enabled providers for this warehouse</returns>
    Task<IReadOnlyCollection<ShippingRateQuote>> GetQuotesForWarehouseAsync(
        Guid warehouseId,
        Address warehouseAddress,
        IReadOnlyCollection<ShipmentPackage> packages,
        string destinationCountry,
        string? destinationState,
        string? destinationPostal,
        string currency,
        CancellationToken cancellationToken = default);
}
