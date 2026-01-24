using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// Response containing list of webhook subscriptions.
/// </summary>
public sealed record ShipBobWebhookSubscriptionsResponse
{
    [JsonPropertyName("webhooks")]
    public IReadOnlyList<ShipBobWebhookSubscription>? Webhooks { get; init; }
}
