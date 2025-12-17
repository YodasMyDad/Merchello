using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Invoice;

/// <summary>
/// Published after an invoice has been cancelled successfully.
/// </summary>
public class InvoiceCancelledNotification(Accounting.Models.Invoice invoice, string reason, int cancelledOrderCount)
    : MerchelloNotification
{
    /// <summary>
    /// Gets the invoice that was cancelled.
    /// </summary>
    public Accounting.Models.Invoice Invoice { get; } = invoice;

    /// <summary>
    /// Gets the cancellation reason.
    /// </summary>
    public string Reason { get; } = reason;

    /// <summary>
    /// Gets the number of orders that were cancelled.
    /// </summary>
    public int CancelledOrderCount { get; } = cancelledOrderCount;
}
