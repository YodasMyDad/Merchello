using Merchello.Core.Webhooks.Models.Enums;

namespace Merchello.Core.Webhooks.Services.Parameters;

/// <summary>
/// Parameters for querying webhook deliveries.
/// </summary>
public class WebhookDeliveryQueryParameters
{
    /// <summary>
    /// Filter by subscription ID.
    /// </summary>
    public Guid? SubscriptionId { get; set; }

    /// <summary>
    /// Filter by topic.
    /// </summary>
    public string? Topic { get; set; }

    /// <summary>
    /// Filter by delivery status.
    /// </summary>
    public WebhookDeliveryStatus? Status { get; set; }

    /// <summary>
    /// Filter by entity ID.
    /// </summary>
    public Guid? EntityId { get; set; }

    /// <summary>
    /// Filter by date range start.
    /// </summary>
    public DateTime? FromDate { get; set; }

    /// <summary>
    /// Filter by date range end.
    /// </summary>
    public DateTime? ToDate { get; set; }

    /// <summary>
    /// Page number (1-based).
    /// </summary>
    public int Page { get; set; } = 1;

    /// <summary>
    /// Page size.
    /// </summary>
    public int PageSize { get; set; } = 20;

    /// <summary>
    /// Sort by field (dateCreated, status, topic).
    /// </summary>
    public string? SortBy { get; set; }

    /// <summary>
    /// Sort direction (asc or desc).
    /// </summary>
    public string? SortDirection { get; set; }
}
