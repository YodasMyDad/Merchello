namespace Merchello.Core.Discounts.Services.Parameters;

/// <summary>
/// Parameters for getting performance metrics for a discount.
/// </summary>
public class GetDiscountPerformanceParameters
{
    /// <summary>
    /// The discount ID.
    /// </summary>
    public required Guid DiscountId { get; set; }

    /// <summary>
    /// Optional start date for filtering.
    /// </summary>
    public DateTime? StartDate { get; set; }

    /// <summary>
    /// Optional end date for filtering.
    /// </summary>
    public DateTime? EndDate { get; set; }
}
