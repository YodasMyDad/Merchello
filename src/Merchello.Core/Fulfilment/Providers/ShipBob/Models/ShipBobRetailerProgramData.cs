using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// Retailer program data for B2B/wholesale orders.
/// </summary>
public sealed record ShipBobRetailerProgramData
{
    [JsonPropertyName("purchase_order_number")]
    public string? PurchaseOrderNumber { get; init; }

    [JsonPropertyName("retailer_program_type")]
    public string? RetailerProgramType { get; init; }

    [JsonPropertyName("expected_delivery_date")]
    public DateTime? ExpectedDeliveryDate { get; init; }

    [JsonPropertyName("mark_for")]
    public ShipBobMarkFor? MarkFor { get; init; }
}
