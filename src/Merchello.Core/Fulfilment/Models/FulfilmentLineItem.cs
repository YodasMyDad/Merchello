namespace Merchello.Core.Fulfilment.Models;

/// <summary>
/// Line item within a fulfilment order request.
/// </summary>
public record FulfilmentLineItem
{
    public required Guid LineItemId { get; init; }
    public required string Sku { get; init; }
    public required string Name { get; init; }
    public required int Quantity { get; init; }
    public decimal UnitPrice { get; init; }
    public decimal? Weight { get; init; }
    public string? Barcode { get; init; }
    public Dictionary<string, object> ExtendedData { get; init; } = [];
}
