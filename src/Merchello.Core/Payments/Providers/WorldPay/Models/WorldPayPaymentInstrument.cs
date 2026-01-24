using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Providers.WorldPay.Models;

internal class WorldPayPaymentInstrument
{
    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonPropertyName("sessionState")]
    public string? SessionState { get; set; }

    [JsonPropertyName("walletToken")]
    public string? WalletToken { get; set; }
}
