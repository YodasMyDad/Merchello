using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// ShipBob shipment information.
/// </summary>
public sealed record ShipBobShipment
{
    [JsonPropertyName("id")]
    public int Id { get; init; }

    [JsonPropertyName("order_id")]
    public int? OrderId { get; init; }

    [JsonPropertyName("status")]
    public string? Status { get; init; }

    [JsonPropertyName("status_details")]
    public IReadOnlyList<ShipBobStatusDetail>? StatusDetails { get; init; }

    [JsonPropertyName("tracking")]
    public ShipBobTracking? Tracking { get; init; }

    [JsonPropertyName("location")]
    public ShipBobLocation? Location { get; init; }

    [JsonPropertyName("products")]
    public IReadOnlyList<ShipBobShipmentProduct>? Products { get; init; }

    [JsonPropertyName("measurements")]
    public ShipBobMeasurements? Measurements { get; init; }

    [JsonPropertyName("estimated_fulfillment_date")]
    public DateTime? EstimatedFulfillmentDate { get; init; }

    [JsonPropertyName("actual_fulfillment_date")]
    public DateTime? ActualFulfillmentDate { get; init; }

    [JsonPropertyName("created_date")]
    public DateTime? CreatedDate { get; init; }

    [JsonPropertyName("last_updated_at")]
    public DateTime? LastUpdatedAt { get; init; }
}
