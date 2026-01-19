using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Protocols.Notifications;

/// <summary>
/// Notification fired before a protocol webhook is sent.
/// Handlers can cancel to prevent sending or modify the payload.
/// </summary>
public class ProtocolWebhookSendingNotification : MerchelloCancelableNotification<string>
{
    public ProtocolWebhookSendingNotification(
        string payload,
        string targetUrl,
        string eventType,
        string protocol)
        : base(payload)
    {
        TargetUrl = targetUrl;
        EventType = eventType;
        Protocol = protocol;
    }

    /// <summary>
    /// The target URL for the webhook.
    /// </summary>
    public string TargetUrl { get; }

    /// <summary>
    /// The event type (e.g., "order.shipped").
    /// </summary>
    public string EventType { get; }

    /// <summary>
    /// The protocol being used (e.g., "ucp").
    /// </summary>
    public string Protocol { get; }

    /// <summary>
    /// Modified payload to send instead of the original.
    /// Set this to change the payload.
    /// </summary>
    public string? ModifiedPayload { get; set; }
}
