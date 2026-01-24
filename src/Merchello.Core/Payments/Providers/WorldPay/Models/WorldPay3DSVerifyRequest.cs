using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Providers.WorldPay.Models;

internal class WorldPay3DSVerifyRequest
{
    [JsonPropertyName("transactionReference")]
    public string? TransactionReference { get; set; }

    [JsonPropertyName("challenge")]
    public WorldPay3DSChallengeVerify? Challenge { get; set; }
}
