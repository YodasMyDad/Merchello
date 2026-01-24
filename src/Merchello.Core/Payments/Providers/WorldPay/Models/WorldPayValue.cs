using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Providers.WorldPay.Models;

internal class WorldPayValue
{
    [JsonPropertyName("currency")]
    public string? Currency { get; set; }

    [JsonPropertyName("amount")]
    public int Amount { get; set; }
}
