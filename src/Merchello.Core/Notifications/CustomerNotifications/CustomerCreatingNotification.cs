using Merchello.Core.Customers.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.CustomerNotifications;

/// <summary>
/// Notification published before a Customer is created.
/// Handlers can modify the entity or cancel the operation.
/// </summary>
public class CustomerCreatingNotification(Customers.Models.Customer customer)
    : MerchelloCancelableNotification<Customers.Models.Customer>(customer)
{
    /// <summary>
    /// The customer being created.
    /// </summary>
    public Customers.Models.Customer Customer => Entity;
}
