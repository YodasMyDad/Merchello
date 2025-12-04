using Merchello.Core.Notifications.Base;
using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Notifications.Shipment;

/// <summary>
/// Published before a shipment is created. Handlers can modify the shipment or cancel creation.
/// </summary>
/// <remarks>
/// Common use cases:
/// - Validate tracking number format for specific carriers
/// - Auto-assign carrier based on tracking number prefix
/// - Validate shipment against business rules
/// </remarks>
public class ShipmentCreatingNotification(Shipping.Models.Shipment shipment)
    : MerchelloCancelableNotification<Shipping.Models.Shipment>(shipment)
{
    /// <summary>
    /// Gets the shipment being created.
    /// </summary>
    public Shipping.Models.Shipment Shipment => Entity;
}
