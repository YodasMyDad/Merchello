using Merchello.Core.Shared.Extensions;
using Merchello.Core.Webhooks.Models.Enums;

namespace Merchello.Core.Webhooks.Models;

/// <summary>
/// Represents a webhook subscription that defines where and how to send webhooks for a specific topic.
/// </summary>
public class WebhookSubscription
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// Display name for this subscription.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// The event topic to subscribe to (e.g., "order.created").
    /// </summary>
    public string Topic { get; set; } = string.Empty;

    /// <summary>
    /// The URL to send webhook payloads to.
    /// </summary>
    public string TargetUrl { get; set; } = string.Empty;

    /// <summary>
    /// Secret key used for HMAC signing.
    /// </summary>
    public string Secret { get; set; } = string.Empty;

    /// <summary>
    /// Authentication type for this webhook.
    /// </summary>
    public WebhookAuthType AuthType { get; set; } = WebhookAuthType.HmacSha256;

    /// <summary>
    /// Custom header name for API key authentication.
    /// </summary>
    public string? AuthHeaderName { get; set; }

    /// <summary>
    /// API key or bearer token value.
    /// </summary>
    public string? AuthHeaderValue { get; set; }

    /// <summary>
    /// Whether this subscription is active.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Payload format (JSON or form-urlencoded).
    /// </summary>
    public WebhookFormat Format { get; set; } = WebhookFormat.Json;

    /// <summary>
    /// API version for payload formatting.
    /// </summary>
    public string? ApiVersion { get; set; }

    /// <summary>
    /// Request timeout in seconds.
    /// </summary>
    public int TimeoutSeconds { get; set; } = 30;

    /// <summary>
    /// Optional JSON path filter expression.
    /// </summary>
    public string? FilterExpression { get; set; }

    /// <summary>
    /// Custom headers to include with each request.
    /// </summary>
    public Dictionary<string, string> Headers { get; set; } = [];

    /// <summary>
    /// Count of successful deliveries.
    /// </summary>
    public int SuccessCount { get; set; }

    /// <summary>
    /// Count of failed deliveries.
    /// </summary>
    public int FailureCount { get; set; }

    /// <summary>
    /// Last time a webhook was triggered for this subscription.
    /// </summary>
    public DateTime? LastTriggeredUtc { get; set; }

    /// <summary>
    /// Last successful delivery time.
    /// </summary>
    public DateTime? LastSuccessUtc { get; set; }

    /// <summary>
    /// Last failed delivery time.
    /// </summary>
    public DateTime? LastFailureUtc { get; set; }

    /// <summary>
    /// Error message from the last failed delivery.
    /// </summary>
    public string? LastErrorMessage { get; set; }

    /// <summary>
    /// When this subscription was created.
    /// </summary>
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When this subscription was last updated.
    /// </summary>
    public DateTime DateUpdated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Extended data for custom metadata.
    /// </summary>
    public Dictionary<string, object> ExtendedData { get; set; } = [];

    /// <summary>
    /// Navigation property for deliveries.
    /// </summary>
    public ICollection<WebhookDelivery>? Deliveries { get; set; }
}
