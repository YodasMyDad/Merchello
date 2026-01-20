using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.UPS.Models;

/// <summary>
/// UPS Rating API response.
/// </summary>
public class UpsRateResponse
{
    [JsonPropertyName("Response")]
    public UpsResponseInfo? Response { get; set; }

    [JsonPropertyName("RatedShipment")]
    public List<UpsRatedShipment>? RatedShipment { get; set; }
}
