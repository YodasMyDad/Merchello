using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// ShipBob inventory level response.
/// </summary>
public sealed record ShipBobInventoryLevelResponse
{
    [JsonPropertyName("id")]
    public int Id { get; init; }

    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("is_digital")]
    public bool IsDigital { get; init; }

    [JsonPropertyName("is_case_pick")]
    public bool IsCasePick { get; init; }

    [JsonPropertyName("is_lot")]
    public bool IsLot { get; init; }

    [JsonPropertyName("total_fulfillable_quantity")]
    public int TotalFulfillableQuantity { get; init; }

    [JsonPropertyName("total_onhand_quantity")]
    public int TotalOnhandQuantity { get; init; }

    [JsonPropertyName("total_committed_quantity")]
    public int TotalCommittedQuantity { get; init; }

    [JsonPropertyName("total_sellable_quantity")]
    public int TotalSellableQuantity { get; init; }

    [JsonPropertyName("total_awaiting_quantity")]
    public int TotalAwaitingQuantity { get; init; }

    [JsonPropertyName("total_exception_quantity")]
    public int TotalExceptionQuantity { get; init; }

    [JsonPropertyName("total_internal_transfer_quantity")]
    public int TotalInternalTransferQuantity { get; init; }

    [JsonPropertyName("total_backordered_quantity")]
    public int TotalBackorderedQuantity { get; init; }

    [JsonPropertyName("fulfillment_center_quantities")]
    public IReadOnlyList<ShipBobFulfillmentCenterQuantity>? FulfillmentCenterQuantities { get; init; }
}

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

/// <summary>
/// Paged response for inventory levels.
/// </summary>
public sealed record ShipBobInventoryLevelsResponse
{
    [JsonPropertyName("inventory")]
    public IReadOnlyList<ShipBobInventoryLevelResponse>? Inventory { get; init; }

    [JsonPropertyName("total_count")]
    public int? TotalCount { get; init; }

    [JsonPropertyName("next_page")]
    public string? NextPage { get; init; }
}
