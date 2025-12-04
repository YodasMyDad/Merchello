using Merchello.Core.Accounting.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Order;

/// <summary>
/// Published after an order has been saved/updated successfully.
/// </summary>
public class OrderSavedNotification(Accounting.Models.Order order) : MerchelloNotification
{
    /// <summary>
    /// Gets the order that was saved.
    /// </summary>
    public Accounting.Models.Order Order { get; } = order;
}
