using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// Product in order response (includes inventory info).
/// </summary>
public sealed record ShipBobOrderProductResponse
{
    [JsonPropertyName("id")]
    public int? Id { get; init; }

    [JsonPropertyName("reference_id")]
    public string? ReferenceId { get; init; }

    [JsonPropertyName("sku")]
    public string? Sku { get; init; }

    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("quantity")]
    public int Quantity { get; init; }

    [JsonPropertyName("quantity_committed")]
    public int? QuantityCommitted { get; init; }

    [JsonPropertyName("quantity_fulfilled")]
    public int? QuantityFulfilled { get; init; }

    [JsonPropertyName("unit_price")]
    public decimal? UnitPrice { get; init; }

    [JsonPropertyName("inventory_items")]
    public IReadOnlyList<ShipBobInventoryItem>? InventoryItems { get; init; }
}
