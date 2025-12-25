using Merchello.Core.Customers.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.CustomerNotifications;

/// <summary>
/// Notification published after a Customer has been saved/updated.
/// </summary>
public class CustomerSavedNotification(Customers.Models.Customer customer) : MerchelloNotification
{
    /// <summary>
    /// The customer that was saved.
    /// </summary>
    public Customers.Models.Customer Customer { get; } = customer;
}
