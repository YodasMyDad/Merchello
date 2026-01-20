using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.UPS.Models;

/// <summary>
/// UPS Rating API request wrapper.
/// </summary>
public class UpsRateRequestWrapper
{
    [JsonPropertyName("RateRequest")]
    public UpsRateRequest RateRequest { get; set; } = null!;
}
