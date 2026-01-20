using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.UPS.Models;

/// <summary>
/// UPS Rating API response wrapper.
/// </summary>
public class UpsRateResponseWrapper
{
    [JsonPropertyName("RateResponse")]
    public UpsRateResponse? RateResponse { get; set; }
}
