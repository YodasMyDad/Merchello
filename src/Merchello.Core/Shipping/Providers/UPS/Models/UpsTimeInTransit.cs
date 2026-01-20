using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.UPS.Models;

public class UpsTimeInTransit
{
    [JsonPropertyName("PickupDate")]
    public string? PickupDate { get; set; }

    [JsonPropertyName("DocumentsOnlyIndicator")]
    public string? DocumentsOnlyIndicator { get; set; }

    [JsonPropertyName("PackageBillType")]
    public string? PackageBillType { get; set; }

    [JsonPropertyName("ServiceSummary")]
    public UpsServiceSummary? ServiceSummary { get; set; }
}
