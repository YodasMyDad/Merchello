namespace Merchello.Core.Accounting.Services.Parameters;

/// <summary>
/// Filter options for invoice cancellation status
/// </summary>
public enum InvoiceCancellationStatusFilter
{
    /// <summary>
    /// Show all invoices regardless of cancellation status
    /// </summary>
    All,

    /// <summary>
    /// Show only active (non-cancelled) invoices
    /// </summary>
    Active,

    /// <summary>
    /// Show only cancelled invoices
    /// </summary>
    Cancelled
}
