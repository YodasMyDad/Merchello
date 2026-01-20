namespace Merchello.Core.Discounts.Services.Parameters;

/// <summary>
/// Fields to order discounts by.
/// </summary>
public enum DiscountOrderBy
{
    /// <summary>
    /// Order by name.
    /// </summary>
    Name,

    /// <summary>
    /// Order by creation date.
    /// </summary>
    DateCreated,

    /// <summary>
    /// Order by start date.
    /// </summary>
    StartsAt,

    /// <summary>
    /// Order by end date.
    /// </summary>
    EndsAt,

    /// <summary>
    /// Order by usage count.
    /// </summary>
    UsageCount,

    /// <summary>
    /// Order by priority.
    /// </summary>
    Priority
}
