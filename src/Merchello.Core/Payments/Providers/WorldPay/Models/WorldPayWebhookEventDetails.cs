using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Providers.WorldPay.Models;

internal class WorldPayWebhookEventDetails
{
    [JsonPropertyName("transactionReference")]
    public string? TransactionReference { get; set; }

    [JsonPropertyName("outcome")]
    public string? Outcome { get; set; }
}
