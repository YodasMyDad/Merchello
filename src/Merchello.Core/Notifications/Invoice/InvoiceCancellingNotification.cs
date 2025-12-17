using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Invoice;

/// <summary>
/// Published before an invoice is cancelled. Handlers can cancel the operation.
/// </summary>
public class InvoiceCancellingNotification(Accounting.Models.Invoice invoice, string reason)
    : MerchelloCancelableNotification<Accounting.Models.Invoice>(invoice)
{
    /// <summary>
    /// Gets the invoice being cancelled.
    /// </summary>
    public Accounting.Models.Invoice Invoice => Entity;

    /// <summary>
    /// Gets the cancellation reason.
    /// </summary>
    public string Reason { get; } = reason;
}
