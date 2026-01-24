using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Providers.WorldPay.Models;

internal class WorldPayWebhookEvent
{
    [JsonPropertyName("eventType")]
    public string? EventType { get; set; }

    [JsonPropertyName("eventTimestamp")]
    public string? EventTimestamp { get; set; }

    [JsonPropertyName("eventDetails")]
    public WorldPayWebhookEventDetails? EventDetails { get; set; }
}
