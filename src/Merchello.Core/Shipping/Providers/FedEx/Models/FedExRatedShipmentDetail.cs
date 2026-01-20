using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.FedEx.Models;

public class FedExRatedShipmentDetail
{
    [JsonPropertyName("rateType")]
    public string? RateType { get; set; }

    [JsonPropertyName("ratedWeightMethod")]
    public string? RatedWeightMethod { get; set; }

    [JsonPropertyName("totalBaseCharge")]
    public decimal? TotalBaseCharge { get; set; }

    [JsonPropertyName("totalNetCharge")]
    public decimal? TotalNetCharge { get; set; }

    [JsonPropertyName("totalNetFedExCharge")]
    public decimal? TotalNetFedExCharge { get; set; }

    [JsonPropertyName("currency")]
    public string? Currency { get; set; }

    [JsonPropertyName("shipmentRateDetail")]
    public FedExShipmentRateDetail? ShipmentRateDetail { get; set; }
}
