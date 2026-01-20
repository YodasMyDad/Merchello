using Merchello.Core.Checkout.Models;

namespace Merchello.Core.Checkout.Services.Parameters;

/// <summary>
/// Parameters for querying abandoned checkouts.
/// </summary>
public class AbandonedCheckoutQueryParameters
{
    /// <summary>
    /// Page number (1-based).
    /// </summary>
    public int Page { get; set; } = 1;

    /// <summary>
    /// Number of items per page.
    /// </summary>
    public int PageSize { get; set; } = 50;

    /// <summary>
    /// Filter by status.
    /// </summary>
    public AbandonedCheckoutStatus? Status { get; set; }

    /// <summary>
    /// Filter by date range start.
    /// </summary>
    public DateTime? FromDate { get; set; }

    /// <summary>
    /// Filter by date range end.
    /// </summary>
    public DateTime? ToDate { get; set; }

    /// <summary>
    /// Search by email or customer name.
    /// </summary>
    public string? Search { get; set; }

    /// <summary>
    /// Filter by minimum basket value.
    /// </summary>
    public decimal? MinValue { get; set; }

    /// <summary>
    /// Field to order by.
    /// </summary>
    public AbandonedCheckoutOrderBy OrderBy { get; set; } = AbandonedCheckoutOrderBy.DateAbandoned;

    /// <summary>
    /// Sort in descending order.
    /// </summary>
    public bool Descending { get; set; } = true;
}
