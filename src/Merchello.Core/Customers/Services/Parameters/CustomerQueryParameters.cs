namespace Merchello.Core.Customers.Services.Parameters;

/// <summary>
/// Parameters for querying paginated customers.
/// </summary>
public class CustomerQueryParameters
{
    /// <summary>
    /// Optional search term for email/name filtering.
    /// </summary>
    public string? Search { get; set; }

    /// <summary>
    /// Page number (1-based).
    /// </summary>
    public int Page { get; set; } = 1;

    /// <summary>
    /// Items per page.
    /// </summary>
    public int PageSize { get; set; } = 50;

    /// <summary>
    /// Optional set of customer IDs to exclude from results (applied before pagination).
    /// </summary>
    public HashSet<Guid>? ExcludeIds { get; set; }
}
