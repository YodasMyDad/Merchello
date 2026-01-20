using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.UPS.Models;

public class UpsShipmentRatingOptions
{
    [JsonPropertyName("NegotiatedRatesIndicator")]
    public string? NegotiatedRatesIndicator { get; set; }

    [JsonPropertyName("UserLevelDiscountIndicator")]
    public string? UserLevelDiscountIndicator { get; set; }
}
