using Merchello.Core.Accounting.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Order;

/// <summary>
/// Published after an order has been created successfully.
/// </summary>
public class OrderCreatedNotification(Accounting.Models.Order order) : MerchelloNotification
{
    /// <summary>
    /// Gets the order that was created.
    /// </summary>
    public Accounting.Models.Order Order { get; } = order;
}
