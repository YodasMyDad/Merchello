using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Providers.WorldPay.Models;

internal class WorldPayAuthorizationRequest
{
    [JsonPropertyName("transactionReference")]
    public string? TransactionReference { get; set; }

    [JsonPropertyName("merchant")]
    public WorldPayMerchant? Merchant { get; set; }

    [JsonPropertyName("instruction")]
    public WorldPayInstruction? Instruction { get; set; }

    [JsonPropertyName("channel")]
    public string? Channel { get; set; }
}
