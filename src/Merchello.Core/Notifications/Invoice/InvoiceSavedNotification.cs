using Merchello.Core.Accounting.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Invoice;

/// <summary>
/// Published after an invoice has been saved/updated successfully.
/// </summary>
public class InvoiceSavedNotification(Accounting.Models.Invoice invoice) : MerchelloNotification
{
    /// <summary>
    /// Gets the invoice that was saved.
    /// </summary>
    public Accounting.Models.Invoice Invoice { get; } = invoice;
}
