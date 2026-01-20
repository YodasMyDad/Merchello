using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.UPS.Models;

/// <summary>
/// UPS Rating API request body.
/// </summary>
public class UpsRateRequest
{
    [JsonPropertyName("Request")]
    public UpsRequestInfo? Request { get; set; }

    [JsonPropertyName("Shipment")]
    public UpsShipment Shipment { get; set; } = null!;
}
