using Merchello.Core.Discounts.Models;

namespace Merchello.Core.Discounts.Services.Parameters;

/// <summary>
/// Parameters for querying discounts.
/// </summary>
public class DiscountQueryParameters
{
    /// <summary>
    /// Filter by status. Null for all statuses.
    /// </summary>
    public DiscountStatus? Status { get; set; }

    /// <summary>
    /// Filter by category. Null for all categories.
    /// </summary>
    public DiscountCategory? Category { get; set; }

    /// <summary>
    /// Filter by method. Null for all methods.
    /// </summary>
    public DiscountMethod? Method { get; set; }

    /// <summary>
    /// Search term to filter by name or code.
    /// </summary>
    public string? SearchTerm { get; set; }

    /// <summary>
    /// Page number (1-based). Defaults to 1.
    /// </summary>
    public int Page { get; set; } = 1;

    /// <summary>
    /// Page size. Defaults to 50.
    /// </summary>
    public int PageSize { get; set; } = 50;

    /// <summary>
    /// Order by field. Defaults to DateCreated.
    /// </summary>
    public DiscountOrderBy OrderBy { get; set; } = DiscountOrderBy.DateCreated;

    /// <summary>
    /// Whether to order descending. Defaults to true (newest first).
    /// </summary>
    public bool Descending { get; set; } = true;
}
