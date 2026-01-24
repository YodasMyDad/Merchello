using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// Webhook data containing order/shipment information.
/// </summary>
public sealed record ShipBobWebhookData
{
    [JsonPropertyName("id")]
    public int? Id { get; init; }

    [JsonPropertyName("order_id")]
    public int? OrderId { get; init; }

    [JsonPropertyName("order_number")]
    public string? OrderNumber { get; init; }

    [JsonPropertyName("reference_id")]
    public string? ReferenceId { get; init; }

    [JsonPropertyName("status")]
    public string? Status { get; init; }

    [JsonPropertyName("shipment")]
    public ShipBobWebhookShipment? Shipment { get; init; }

    [JsonPropertyName("shipments")]
    public IReadOnlyList<ShipBobWebhookShipment>? Shipments { get; init; }

    [JsonPropertyName("exception")]
    public ShipBobWebhookException? Exception { get; init; }

    [JsonPropertyName("channel")]
    public ShipBobChannel? Channel { get; init; }

    [JsonPropertyName("created_date")]
    public DateTime? CreatedDate { get; init; }

    [JsonPropertyName("updated_date")]
    public DateTime? UpdatedDate { get; init; }
}
