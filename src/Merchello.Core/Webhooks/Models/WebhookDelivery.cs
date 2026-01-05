using Merchello.Core.Shared.Extensions;
using Merchello.Core.Webhooks.Models.Enums;

namespace Merchello.Core.Webhooks.Models;

/// <summary>
/// Represents a webhook delivery attempt with full request/response details.
/// </summary>
public class WebhookDelivery
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// The subscription this delivery is for.
    /// </summary>
    public Guid SubscriptionId { get; set; }

    /// <summary>
    /// Navigation property to the subscription.
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

    /// <summary>
    /// The URL the request was sent to.
    /// </summary>
    public string TargetUrl { get; set; } = string.Empty;

    /// <summary>
    /// The JSON request body.
    /// </summary>
    public string RequestBody { get; set; } = string.Empty;

    /// <summary>
    /// Request headers as JSON.
    /// </summary>
    public string RequestHeaders { get; set; } = string.Empty;

    /// <summary>
    /// Current delivery status.
    /// </summary>
    public WebhookDeliveryStatus Status { get; set; } = WebhookDeliveryStatus.Pending;

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
}
