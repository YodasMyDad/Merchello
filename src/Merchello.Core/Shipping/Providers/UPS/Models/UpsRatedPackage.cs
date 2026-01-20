using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.UPS.Models;

public class UpsRatedPackage
{
    [JsonPropertyName("TransportationCharges")]
    public UpsCharges? TransportationCharges { get; set; }

    [JsonPropertyName("ServiceOptionsCharges")]
    public UpsCharges? ServiceOptionsCharges { get; set; }

    [JsonPropertyName("TotalCharges")]
    public UpsCharges? TotalCharges { get; set; }

    [JsonPropertyName("Weight")]
    public string? Weight { get; set; }

    [JsonPropertyName("BillingWeight")]
    public UpsBillingWeight? BillingWeight { get; set; }
}
