using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.UPS.Models;

public class UpsDeliveryTimeInformation
{
    /// <summary>
    /// Package bill type. 03 = Non-Document.
    /// </summary>
    [JsonPropertyName("PackageBillType")]
    public string? PackageBillType { get; set; } = "03";

    [JsonPropertyName("Pickup")]
    public UpsPickup? Pickup { get; set; }
}
