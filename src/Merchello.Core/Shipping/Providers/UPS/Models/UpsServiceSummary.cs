using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.UPS.Models;

public class UpsServiceSummary
{
    [JsonPropertyName("Service")]
    public UpsService? Service { get; set; }

    [JsonPropertyName("EstimatedArrival")]
    public UpsEstimatedArrival? EstimatedArrival { get; set; }

    [JsonPropertyName("GuaranteedIndicator")]
    public string? GuaranteedIndicator { get; set; }

    [JsonPropertyName("SaturdayDelivery")]
    public string? SaturdayDelivery { get; set; }
}
