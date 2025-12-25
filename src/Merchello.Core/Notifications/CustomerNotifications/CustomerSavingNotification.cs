using Merchello.Core.Customers.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.CustomerNotifications;

/// <summary>
/// Notification published before a Customer is saved/updated.
/// Handlers can modify the entity or cancel the operation.
/// </summary>
public class CustomerSavingNotification(Customers.Models.Customer customer)
    : MerchelloCancelableNotification<Customers.Models.Customer>(customer)
{
    /// <summary>
    /// The customer being saved.
    /// </summary>
    public Customers.Models.Customer Customer => Entity;
}
