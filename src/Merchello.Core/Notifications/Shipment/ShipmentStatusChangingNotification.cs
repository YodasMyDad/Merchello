using Merchello.Core.Notifications.Base;
using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Notifications.Shipment;

/// <summary>
/// Published before a shipment status is changed. Handlers can modify the shipment or cancel the transition.
/// </summary>
/// <remarks>
/// Common use cases:
/// - Validate that tracking info is present before transitioning to Shipped
/// - Validate business rules before allowing status change
/// - Auto-populate carrier or tracking URL based on tracking number
/// </remarks>
public class ShipmentStatusChangingNotification(
    Shipping.Models.Shipment shipment,
    ShipmentStatus oldStatus,
    ShipmentStatus newStatus)
    : MerchelloCancelableNotification<Shipping.Models.Shipment>(shipment)
{
    /// <summary>
    /// Gets the shipment whose status is changing.
    /// </summary>
    public Shipping.Models.Shipment Shipment => Entity;

    /// <summary>
    /// Gets the current status before the change.
    /// </summary>
    public ShipmentStatus OldStatus { get; } = oldStatus;

    /// <summary>
    /// Gets the target status after the change.
    /// </summary>
    public ShipmentStatus NewStatus { get; } = newStatus;
}
