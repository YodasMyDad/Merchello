using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// Tracking information for a shipment.
/// </summary>
public sealed record ShipBobTracking
{
    [JsonPropertyName("tracking_number")]
    public string? TrackingNumber { get; init; }

    [JsonPropertyName("tracking_url")]
    public string? TrackingUrl { get; init; }

    [JsonPropertyName("carrier")]
    public string? Carrier { get; init; }

    [JsonPropertyName("carrier_service")]
    public string? CarrierService { get; init; }

    [JsonPropertyName("shipping_method")]
    public string? ShippingMethod { get; init; }

    [JsonPropertyName("shipping_date")]
    public DateTime? ShippingDate { get; init; }

    [JsonPropertyName("delivery_date")]
    public DateTime? DeliveryDate { get; init; }

    [JsonPropertyName("estimated_delivery_date")]
    public DateTime? EstimatedDeliveryDate { get; init; }

    [JsonPropertyName("bol")]
    public string? BillOfLading { get; init; }

    [JsonPropertyName("scac")]
    public string? Scac { get; init; }

    [JsonPropertyName("pro_number")]
    public string? ProNumber { get; init; }
}
