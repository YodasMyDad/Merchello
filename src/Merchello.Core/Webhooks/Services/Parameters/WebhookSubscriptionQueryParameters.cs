namespace Merchello.Core.Webhooks.Services.Parameters;

/// <summary>
/// Parameters for querying webhook subscriptions.
/// </summary>
public class WebhookSubscriptionQueryParameters
{
    /// <summary>
    /// Filter by topic.
    /// </summary>
    public string? Topic { get; set; }

    /// <summary>
    /// Filter by active status.
    /// </summary>
    public bool? IsActive { get; set; }

    /// <summary>
    /// Search term for name or URL.
    /// </summary>
    public string? SearchTerm { get; set; }

    /// <summary>
    /// Page number (1-based).
    /// </summary>
    public int Page { get; set; } = 1;

    /// <summary>
    /// Page size.
    /// </summary>
    public int PageSize { get; set; } = 20;

    /// <summary>
    /// Sort by field (name, topic, dateCreated).
    /// </summary>
    public string? SortBy { get; set; }

    /// <summary>
    /// Sort direction (asc or desc).
    /// </summary>
    public string? SortDirection { get; set; }
}
