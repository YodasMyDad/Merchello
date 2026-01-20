using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.UPS.Models;

public class UpsRatedShipment
{
    [JsonPropertyName("Service")]
    public UpsService? Service { get; set; }

    [JsonPropertyName("RatedShipmentAlert")]
    public List<UpsAlert>? RatedShipmentAlert { get; set; }

    [JsonPropertyName("BillingWeight")]
    public UpsBillingWeight? BillingWeight { get; set; }

    [JsonPropertyName("TransportationCharges")]
    public UpsCharges? TransportationCharges { get; set; }

    [JsonPropertyName("BaseServiceCharge")]
    public UpsCharges? BaseServiceCharge { get; set; }

    [JsonPropertyName("ServiceOptionsCharges")]
    public UpsCharges? ServiceOptionsCharges { get; set; }

    [JsonPropertyName("TotalCharges")]
    public UpsCharges? TotalCharges { get; set; }

    [JsonPropertyName("NegotiatedRateCharges")]
    public UpsNegotiatedRateCharges? NegotiatedRateCharges { get; set; }

    [JsonPropertyName("GuaranteedDelivery")]
    public UpsGuaranteedDelivery? GuaranteedDelivery { get; set; }

    [JsonPropertyName("RatedPackage")]
    public List<UpsRatedPackage>? RatedPackage { get; set; }

    [JsonPropertyName("TimeInTransit")]
    public UpsTimeInTransit? TimeInTransit { get; set; }
}
