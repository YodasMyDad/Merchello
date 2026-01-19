using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Protocols.Notifications;

/// <summary>
/// Notification fired after a protocol webhook is sent.
/// </summary>
public class ProtocolWebhookSentNotification : MerchelloNotification
{
    public ProtocolWebhookSentNotification(
        string payload,
        string targetUrl,
        string eventType,
        string protocol,
        bool success,
        int? statusCode,
        string? errorMessage)
    {
        Payload = payload;
        TargetUrl = targetUrl;
        EventType = eventType;
        Protocol = protocol;
        Success = success;
        StatusCode = statusCode;
        ErrorMessage = errorMessage;
    }

    /// <summary>
    /// The webhook payload that was sent.
    /// </summary>
    public string Payload { get; }

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
    /// Whether the webhook was delivered successfully.
    /// </summary>
    public bool Success { get; }

    /// <summary>
    /// The HTTP status code from the recipient.
    /// </summary>
    public int? StatusCode { get; }

    /// <summary>
    /// Error message if delivery failed.
    /// </summary>
    public string? ErrorMessage { get; }
}
