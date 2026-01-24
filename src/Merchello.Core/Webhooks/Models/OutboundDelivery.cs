using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models.Enums;

namespace Merchello.Core.Webhooks.Models;

/// <summary>
/// Represents an outbound delivery attempt (webhook or email) with full details.
/// Previously WebhookDelivery, now supports both delivery types.
/// </summary>
public class OutboundDelivery
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// The type of delivery (Webhook or Email).
    /// </summary>
    public OutboundDeliveryType DeliveryType { get; set; } = OutboundDeliveryType.Webhook;

    /// <summary>
    /// The configuration ID this delivery is for.
    /// For webhooks: WebhookSubscription.Id
    /// For emails: EmailConfiguration.Id
    /// </summary>
    public Guid ConfigurationId { get; set; }

    /// <summary>
    /// Navigation property to the webhook subscription (for webhook deliveries).
    /// </summary>
    public WebhookSubscription? Subscription { get; set; }

    /// <summary>
    /// The event topic (e.g., "order.created").
    /// </summary>
    public string Topic { get; set; } = string.Empty;

    /// <summary>
    /// ID of the related entity (order, product, etc.).
    /// </summary>
    public Guid? EntityId { get; set; }

    /// <summary>
    /// Type name of the related entity.
    /// </summary>
    public string? EntityType { get; set; }

    // ============ WEBHOOK-SPECIFIC FIELDS ============

    /// <summary>
    /// [Webhook] The URL the request was sent to.
    /// </summary>
    public string? TargetUrl { get; set; }

    /// <summary>
    /// [Webhook] The JSON request body.
    /// </summary>
    public string? RequestBody { get; set; }

    /// <summary>
    /// [Webhook] Request headers as JSON.
    /// </summary>
    public string? RequestHeaders { get; set; }

    /// <summary>
    /// Current delivery status.
    /// </summary>
    public OutboundDeliveryStatus Status { get; set; } = OutboundDeliveryStatus.Pending;

    /// <summary>
    /// HTTP response status code.
    /// </summary>
    public int? ResponseStatusCode { get; set; }

    /// <summary>
    /// Response body (truncated if large).
    /// </summary>
    public string? ResponseBody { get; set; }

    /// <summary>
    /// Response headers as JSON.
    /// </summary>
    public string? ResponseHeaders { get; set; }

    /// <summary>
    /// Error message if delivery failed.
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// When this delivery was created/queued.
    /// </summary>
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When the request was actually sent.
    /// </summary>
    public DateTime? DateSent { get; set; }

    /// <summary>
    /// When the delivery completed (success or final failure).
    /// </summary>
    public DateTime? DateCompleted { get; set; }

    /// <summary>
    /// Request duration in milliseconds.
    /// </summary>
    public int DurationMs { get; set; }

    /// <summary>
    /// Current attempt number (starts at 1).
    /// </summary>
    public int AttemptNumber { get; set; } = 1;

    /// <summary>
    /// When the next retry should be attempted.
    /// </summary>
    public DateTime? NextRetryUtc { get; set; }

    // ============ EMAIL-SPECIFIC FIELDS ============

    /// <summary>
    /// [Email] The recipient email address(es).
    /// </summary>
    public string? EmailRecipients { get; set; }

    /// <summary>
    /// [Email] The email subject.
    /// </summary>
    public string? EmailSubject { get; set; }

    /// <summary>
    /// [Email] The from email address.
    /// </summary>
    public string? EmailFrom { get; set; }

    /// <summary>
    /// [Email] The rendered email body (HTML).
    /// </summary>
    public string? EmailBody { get; set; }

    // ============ SHARED ============

    /// <summary>
    /// Additional type-specific data stored as JSON.
    /// </summary>
    public Dictionary<string, object> ExtendedData { get; set; } = [];
}
