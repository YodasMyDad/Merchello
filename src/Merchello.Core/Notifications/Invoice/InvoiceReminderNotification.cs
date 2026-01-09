using Merchello.Core.Accounting.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Invoice;

/// <summary>
/// Published when an invoice payment is due soon (before the due date).
/// Used for payment reminder emails.
/// </summary>
public class InvoiceReminderNotification(
    Accounting.Models.Invoice invoice,
    int daysUntilDue) : MerchelloNotification
{
    /// <summary>
    /// Gets the invoice with upcoming payment due.
    /// </summary>
    public Accounting.Models.Invoice Invoice { get; } = invoice;

    /// <summary>
    /// Gets the number of days until the payment is due.
    /// </summary>
    public int DaysUntilDue { get; } = daysUntilDue;
}
