using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Shipping.Providers.Models;

/// <summary>
/// Represents a parsed shipping quote request scoped to a specific warehouse configuration.
/// </summary>
public record WarehouseQuoteContext(
    ShippingQuoteRequest Request,
    WarehouseProviderConfig WarehouseConfig);
