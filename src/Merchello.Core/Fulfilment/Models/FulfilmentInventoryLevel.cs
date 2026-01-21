namespace Merchello.Core.Fulfilment.Models;

/// <summary>
/// Inventory level reported by a fulfilment provider.
/// </summary>
public record FulfilmentInventoryLevel
{
    public required string Sku { get; init; }
    public string? WarehouseCode { get; init; }
    public required int AvailableQuantity { get; init; }
    public int? ReservedQuantity { get; init; }
    public int? IncomingQuantity { get; init; }
    public DateTime? LastUpdated { get; init; }
}
