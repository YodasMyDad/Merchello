using Merchello.Core.Webhooks.Models;

namespace Merchello.Core.Webhooks.Services.Interfaces;

/// <summary>
/// Interface for sending webhook HTTP requests.
/// </summary>
public interface IWebhookDispatcher
{
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
