using Merchello.Core.Discounts.Models;

namespace Merchello.Core.Discounts.Services.Parameters;

/// <summary>
/// Parameters for querying discount usage summary reports.
/// </summary>
public class DiscountReportParameters
{
    /// <summary>
    /// Filter usages from this date onwards.
    /// </summary>
    public DateTime? StartDate { get; set; }

    /// <summary>
    /// Filter usages up to this date.
    /// </summary>
    public DateTime? EndDate { get; set; }

    /// <summary>
    /// Filter by discount status.
    /// </summary>
    public DiscountStatus? Status { get; set; }

    /// <summary>
    /// Filter by discount category.
    /// </summary>
    public DiscountCategory? Category { get; set; }

    /// <summary>
    /// Filter by discount method.
    /// </summary>
    public DiscountMethod? Method { get; set; }

    /// <summary>
    /// Limit the number of results returned.
    /// </summary>
    public int? Top { get; set; }

    /// <summary>
    /// Order results by this field.
    /// </summary>
    public DiscountReportOrderBy OrderBy { get; set; } = DiscountReportOrderBy.TotalUsage;

    /// <summary>
    /// Sort in descending order (default true for most useful results first).
    /// </summary>
    public bool Descending { get; set; } = true;
}

/// <summary>
/// Fields available for ordering discount usage reports.
/// </summary>
public enum DiscountReportOrderBy
{
    TotalUsage,
    TotalDiscountAmount,
    UniqueCustomers,
    Name
}
