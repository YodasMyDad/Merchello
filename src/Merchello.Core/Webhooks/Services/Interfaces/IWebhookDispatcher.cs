using Merchello.Core.Webhooks.Models;

namespace Merchello.Core.Webhooks.Services.Interfaces;

/// <summary>
/// Interface for sending webhook HTTP requests.
/// </summary>
public interface IWebhookDispatcher
{
    /// <summary>
    /// Dispatches a webhook for all active subscriptions of a topic.
    /// </summary>
    Task DispatchAsync<T>(
        string topic,
        T payload,
        Guid? entityId = null,
        CancellationToken ct = default) where T : class;

    /// <summary>
    /// Sends a webhook delivery with signing and retry logic.
    /// </summary>
    Task<OutboundDeliveryResult> SendAsync(
        OutboundDelivery delivery,
        WebhookSubscription subscription,
        CancellationToken ct = default);

    /// <summary>
    /// Pings a URL to verify connectivity.
    /// </summary>
    Task<OutboundDeliveryResult> PingAsync(
        string url,
        CancellationToken ct = default);
}
