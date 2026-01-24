using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// Webhook subscription response.
/// </summary>
public sealed record ShipBobWebhookSubscription
{
    [JsonPropertyName("id")]
    public int Id { get; init; }

    [JsonPropertyName("topic")]
    public string? Topic { get; init; }

    [JsonPropertyName("subscription_url")]
    public string? SubscriptionUrl { get; init; }

    [JsonPropertyName("created_at")]
    public DateTime? CreatedAt { get; init; }
}
