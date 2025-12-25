using Merchello.Core.Customers.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.CustomerNotifications;

/// <summary>
/// Notification published after a Customer has been deleted.
/// </summary>
public class CustomerDeletedNotification(Customers.Models.Customer customer) : MerchelloNotification
{
    /// <summary>
    /// The customer that was deleted.
    /// </summary>
    public Customers.Models.Customer Customer { get; } = customer;
}
