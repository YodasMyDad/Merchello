using Merchello.Core.Accounting.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Order;

/// <summary>
/// Published before an order is created. Handlers can modify the order or cancel creation.
/// </summary>
/// <remarks>
/// Common use cases:
/// - Validate order against business rules (minimum order value, restricted items)
/// - Fraud detection and risk scoring
/// - Apply custom order modifications before persistence
/// - Block orders from certain regions or customers
/// </remarks>
public class OrderCreatingNotification(Accounting.Models.Order order)
    : MerchelloCancelableNotification<Accounting.Models.Order>(order)
{
    /// <summary>
    /// Gets the order being created.
    /// </summary>
    public Accounting.Models.Order Order => Entity;
}
