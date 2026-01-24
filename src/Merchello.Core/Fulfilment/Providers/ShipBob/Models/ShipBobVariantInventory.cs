using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// Variant inventory information.
/// </summary>
public sealed record ShipBobVariantInventory
{
    [JsonPropertyName("inventory_id")]
    public int? InventoryId { get; init; }

    [JsonPropertyName("on_hand_qty")]
    public int? OnHandQty { get; init; }
}
