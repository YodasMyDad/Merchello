using Merchello.Core.Customers.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.CustomerNotifications;

/// <summary>
/// Notification published before a Customer is deleted.
/// Handlers can cancel the operation.
/// </summary>
public class CustomerDeletingNotification(Customers.Models.Customer customer)
    : MerchelloCancelableNotification<Customers.Models.Customer>(customer)
{
    /// <summary>
    /// The customer being deleted.
    /// </summary>
    public Customers.Models.Customer Customer => Entity;
}
