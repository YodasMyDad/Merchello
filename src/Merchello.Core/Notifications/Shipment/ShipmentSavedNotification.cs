using Merchello.Core.Notifications.Base;
using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Notifications.Shipment;

/// <summary>
/// Published after a shipment has been saved/updated successfully.
/// </summary>
public class ShipmentSavedNotification(Shipping.Models.Shipment shipment) : MerchelloNotification
{
    /// <summary>
    /// Gets the shipment that was saved.
    /// </summary>
    public Shipping.Models.Shipment Shipment { get; } = shipment;
}
