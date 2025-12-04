using Merchello.Core.Notifications.Base;
using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Notifications.Shipment;

/// <summary>
/// Published after a shipment has been created successfully.
/// </summary>
public class ShipmentCreatedNotification(Shipping.Models.Shipment shipment) : MerchelloNotification
{
    /// <summary>
    /// Gets the shipment that was created.
    /// </summary>
    public Shipping.Models.Shipment Shipment { get; } = shipment;
}
