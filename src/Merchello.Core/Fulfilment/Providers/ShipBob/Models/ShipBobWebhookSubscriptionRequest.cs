using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// Webhook subscription request.
/// </summary>
public sealed record ShipBobWebhookSubscriptionRequest
{
    [JsonPropertyName("topic")]
    public required string Topic { get; init; }

    [JsonPropertyName("subscription_url")]
    public required string SubscriptionUrl { get; init; }
}
