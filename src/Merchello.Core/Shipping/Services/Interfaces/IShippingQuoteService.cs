using Merchello.Core.Checkout.Models;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Shipping.Services.Parameters;

namespace Merchello.Core.Shipping.Services.Interfaces;

public interface IShippingQuoteService
{
    /// <summary>
    /// Gets shipping quotes for a basket (basket-level, may involve multiple warehouses).
    /// </summary>
    Task<IReadOnlyCollection<ShippingRateQuote>> GetQuotesAsync(
        Basket basket,
        string countryCode,
        string? regionCode = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets shipping quotes for a specific warehouse (per-warehouse quotes for order grouping).
    /// Used by DefaultOrderGroupingStrategy to fetch rates from dynamic providers.
    /// </summary>
    Task<IReadOnlyCollection<ShippingRateQuote>> GetQuotesForWarehouseAsync(
        GetWarehouseQuotesParameters parameters,
        CancellationToken cancellationToken = default);
}
