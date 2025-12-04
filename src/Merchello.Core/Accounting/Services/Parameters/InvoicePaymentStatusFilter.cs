namespace Merchello.Core.Accounting.Services.Parameters;

/// <summary>
/// Filter options for invoice payment status
/// </summary>
public enum InvoicePaymentStatusFilter
{
    /// <summary>
    /// Show all invoices regardless of payment status
    /// </summary>
    All,

    /// <summary>
    /// Show only fully paid invoices
    /// </summary>
    Paid,

    /// <summary>
    /// Show only unpaid or partially paid invoices
    /// </summary>
    Unpaid
}

