using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.FedEx.Models;

public class FedExRateOutput
{
    [JsonPropertyName("rateReplyDetails")]
    public List<FedExRateReplyDetail>? RateReplyDetails { get; set; }
}
