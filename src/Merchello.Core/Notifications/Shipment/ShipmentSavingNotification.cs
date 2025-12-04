using Merchello.Core.Notifications.Base;
using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Notifications.Shipment;

/// <summary>
/// Published before a shipment is saved/updated. Handlers can modify the shipment or cancel the save.
/// </summary>
public class ShipmentSavingNotification(Shipping.Models.Shipment shipment)
    : MerchelloCancelableNotification<Shipping.Models.Shipment>(shipment)
{
    /// <summary>
    /// Gets the shipment being saved.
    /// </summary>
    public Shipping.Models.Shipment Shipment => Entity;
}
