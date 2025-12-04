using Merchello.Core.Accounting.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Order;

/// <summary>
/// Published before an order is saved/updated. Handlers can modify the order or cancel the save.
/// </summary>
public class OrderSavingNotification(Accounting.Models.Order order)
    : MerchelloCancelableNotification<Accounting.Models.Order>(order)
{
    /// <summary>
    /// Gets the order being saved.
    /// </summary>
    public Accounting.Models.Order Order => Entity;
}
