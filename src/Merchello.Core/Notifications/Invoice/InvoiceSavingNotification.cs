using Merchello.Core.Accounting.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Invoice;

/// <summary>
/// Published before an invoice is saved/updated. Handlers can modify the invoice or cancel the save.
/// </summary>
public class InvoiceSavingNotification(Accounting.Models.Invoice invoice)
    : MerchelloCancelableNotification<Accounting.Models.Invoice>(invoice)
{
    /// <summary>
    /// Gets the invoice being saved.
    /// </summary>
    public Accounting.Models.Invoice Invoice => Entity;
}
