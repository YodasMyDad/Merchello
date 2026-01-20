using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.FedEx.Models;

public class FedExShipmentRateDetail
{
    [JsonPropertyName("totalBaseCharge")]
    public decimal? TotalBaseCharge { get; set; }

    [JsonPropertyName("totalNetCharge")]
    public decimal? TotalNetCharge { get; set; }

    [JsonPropertyName("totalBillingWeight")]
    public FedExWeight? TotalBillingWeight { get; set; }

    [JsonPropertyName("currency")]
    public string? Currency { get; set; }
}
