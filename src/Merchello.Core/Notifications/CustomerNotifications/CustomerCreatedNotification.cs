using Merchello.Core.Customers.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.CustomerNotifications;

/// <summary>
/// Notification published after a Customer has been created.
/// </summary>
public class CustomerCreatedNotification(Customers.Models.Customer customer) : MerchelloNotification
{
    /// <summary>
    /// The customer that was created.
    /// </summary>
    public Customers.Models.Customer Customer { get; } = customer;
}
