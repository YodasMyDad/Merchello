using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.UPS.Models;

public class UpsShipment
{
    [JsonPropertyName("Shipper")]
    public UpsShipper Shipper { get; set; } = null!;

    [JsonPropertyName("ShipTo")]
    public UpsShipTo ShipTo { get; set; } = null!;

    [JsonPropertyName("ShipFrom")]
    public UpsShipFrom? ShipFrom { get; set; }

    [JsonPropertyName("PaymentDetails")]
    public UpsPaymentDetails? PaymentDetails { get; set; }

    [JsonPropertyName("Service")]
    public UpsService? Service { get; set; }

    [JsonPropertyName("NumOfPieces")]
    public string? NumOfPieces { get; set; }

    [JsonPropertyName("Package")]
    public List<UpsPackage> Package { get; set; } = [];

    [JsonPropertyName("ShipmentRatingOptions")]
    public UpsShipmentRatingOptions? ShipmentRatingOptions { get; set; }

    [JsonPropertyName("DeliveryTimeInformation")]
    public UpsDeliveryTimeInformation? DeliveryTimeInformation { get; set; }
}
