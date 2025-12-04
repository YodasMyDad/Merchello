using Merchello.Core.Accounting.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Invoice;

/// <summary>
/// Published after an invoice has been soft-deleted successfully.
/// </summary>
public class InvoiceDeletedNotification(Accounting.Models.Invoice invoice) : MerchelloNotification
{
    /// <summary>
    /// Gets the invoice that was deleted.
    /// </summary>
    public Accounting.Models.Invoice Invoice { get; } = invoice;
}
