using Merchello.Core.Shared.Models.Enums;

namespace Merchello.Core.Webhooks.Services.Parameters;

/// <summary>
/// Parameters for querying outbound deliveries (webhooks and emails).
/// </summary>
public class OutboundDeliveryQueryParameters
{
    /// <summary>
    /// Filter by configuration ID (subscription or email config).
    /// </summary>
    public Guid? ConfigurationId { get; set; }

    /// <summary>
    /// Filter by delivery type (Webhook or Email).
    /// </summary>
    public OutboundDeliveryType? DeliveryType { get; set; }

    /// <summary>
    /// Filter by topic.
    /// </summary>
    public string? Topic { get; set; }

    /// <summary>
    /// Filter by delivery status.
    /// </summary>
    public OutboundDeliveryStatus? Status { get; set; }

    /// <summary>
    /// Filter by multiple delivery statuses.
    /// </summary>
    public IReadOnlyCollection<OutboundDeliveryStatus>? Statuses { get; set; }

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
