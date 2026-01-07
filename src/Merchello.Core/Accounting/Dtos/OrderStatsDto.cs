namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Order statistics for dashboard
/// </summary>
public class OrderStatsDto
{
    public int OrdersToday { get; set; }
    public int ItemsOrderedToday { get; set; }
    public int OrdersFulfilledToday { get; set; }

    /// <summary>
    /// Total outstanding value across all unpaid invoices.
    /// </summary>
    public decimal TotalOutstandingValue { get; set; }

    /// <summary>
    /// Number of invoices with outstanding balance.
    /// </summary>
    public int OutstandingInvoiceCount { get; set; }

    /// <summary>
    /// Number of invoices that are past due date.
    /// </summary>
    public int OverdueInvoiceCount { get; set; }

    /// <summary>
    /// Currency code for the outstanding values.
    /// </summary>
    public string CurrencyCode { get; set; } = string.Empty;
}
