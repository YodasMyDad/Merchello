using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Providers.WorldPay.Models;

internal class WorldPay3DSAuthResponse
{
    [JsonPropertyName("outcome")]
    public string? Outcome { get; set; }

    [JsonPropertyName("transactionReference")]
    public string? TransactionReference { get; set; }

    [JsonPropertyName("authentication")]
    public WorldPay3DSAuthentication? Authentication { get; set; }

    [JsonPropertyName("challenge")]
    public WorldPay3DSChallengeResponse? Challenge { get; set; }

    [JsonPropertyName("_links")]
    public WorldPay3DSLinks? Links { get; set; }
}
