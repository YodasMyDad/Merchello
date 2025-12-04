using Merchello.Core.Accounting.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Invoice;

/// <summary>
/// Published before an invoice is soft-deleted. Handlers can cancel the deletion.
/// </summary>
public class InvoiceDeletingNotification(Accounting.Models.Invoice invoice)
    : MerchelloCancelableNotification<Accounting.Models.Invoice>(invoice)
{
    /// <summary>
    /// Gets the invoice being deleted.
    /// </summary>
    public Accounting.Models.Invoice Invoice => Entity;
}
