namespace Merchello.Core.Email.Services.Parameters;

/// <summary>
/// Query parameters for retrieving email configurations.
/// </summary>
public class EmailConfigurationQueryParameters
{
    /// <summary>
    /// Filter by topic (e.g., "order.created").
    /// </summary>
    public string? Topic { get; set; }

    /// <summary>
    /// Filter by topic category (e.g., "Orders", "Customers").
    /// </summary>
    public string? Category { get; set; }

    /// <summary>
    /// Filter by enabled status.
    /// </summary>
    public bool? Enabled { get; set; }

    /// <summary>
    /// Search term to filter by name or description.
    /// </summary>
    public string? SearchTerm { get; set; }

    /// <summary>
    /// Page number (1-based).
    /// </summary>
    public int Page { get; set; } = 1;

    /// <summary>
    /// Number of items per page.
    /// </summary>
    public int PageSize { get; set; } = 20;

    /// <summary>
    /// Field to sort by (Name, Topic, DateCreated, DateModified, LastSentUtc).
    /// </summary>
    public string? SortBy { get; set; }

    /// <summary>
    /// Sort direction (asc or desc).
    /// </summary>
    public string? SortDirection { get; set; } = "asc";
}
