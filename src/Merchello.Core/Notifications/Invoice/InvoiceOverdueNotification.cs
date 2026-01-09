using Merchello.Core.Accounting.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Invoice;

/// <summary>
/// Published when an invoice payment is past due.
/// Used for overdue payment reminder emails.
/// </summary>
public class InvoiceOverdueNotification(
    Accounting.Models.Invoice invoice,
    int daysOverdue,
    int reminderNumber) : MerchelloNotification
{
    /// <summary>
    /// Gets the overdue invoice.
    /// </summary>
    public Accounting.Models.Invoice Invoice { get; } = invoice;

    /// <summary>
    /// Gets the number of days the payment is overdue.
    /// </summary>
    public int DaysOverdue { get; } = daysOverdue;

    /// <summary>
    /// Gets the reminder number (1st, 2nd, 3rd reminder, etc.).
    /// </summary>
    public int ReminderNumber { get; } = reminderNumber;
}
