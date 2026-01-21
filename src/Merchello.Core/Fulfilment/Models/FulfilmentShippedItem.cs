namespace Merchello.Core.Fulfilment.Models;

/// <summary>
/// Individual item within a shipment (for partial shipments).
/// </summary>
public record FulfilmentShippedItem
{
    public required string Sku { get; init; }
    public required int QuantityShipped { get; init; }
}
