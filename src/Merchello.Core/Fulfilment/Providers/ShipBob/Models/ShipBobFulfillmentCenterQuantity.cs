using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// Inventory quantities per fulfillment center.
/// </summary>
public sealed record ShipBobFulfillmentCenterQuantity
{
    [JsonPropertyName("id")]
    public int Id { get; init; }

    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("fulfillable_quantity")]
    public int FulfillableQuantity { get; init; }

    [JsonPropertyName("onhand_quantity")]
    public int OnhandQuantity { get; init; }

    [JsonPropertyName("committed_quantity")]
    public int CommittedQuantity { get; init; }

    [JsonPropertyName("awaiting_quantity")]
    public int AwaitingQuantity { get; init; }

    [JsonPropertyName("internal_transfer_quantity")]
    public int InternalTransferQuantity { get; init; }
}
