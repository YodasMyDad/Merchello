using Merchello.Core.Notifications.Base;
using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Notifications.Shipment;

/// <summary>
/// Published after a shipment status has been successfully changed.
/// </summary>
/// <remarks>
/// Common use cases:
/// - Send email notification when shipment is shipped (with tracking info)
/// - Send email notification when shipment is delivered
/// - Log status change for audit purposes
/// - Trigger external integrations (webhook, ERP sync, etc.)
/// </remarks>
public class ShipmentStatusChangedNotification(
    Shipping.Models.Shipment shipment,
    ShipmentStatus oldStatus,
    ShipmentStatus newStatus) : MerchelloNotification
{
    /// <summary>
    /// Gets the shipment whose status changed.
    /// </summary>
    public Shipping.Models.Shipment Shipment { get; } = shipment;

    /// <summary>
    /// Gets the status before the change.
    /// </summary>
    public ShipmentStatus OldStatus { get; } = oldStatus;

    /// <summary>
    /// Gets the status after the change.
    /// </summary>
    public ShipmentStatus NewStatus { get; } = newStatus;
}
