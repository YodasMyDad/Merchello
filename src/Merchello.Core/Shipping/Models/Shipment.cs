using Merchello.Core.Accounting.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Warehouses.Models;

namespace Merchello.Core.Shipping.Models;

public class Shipment
{
    /// <summary>
    /// Shipment Id
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// Order associated with this shipment
    /// </summary>
    public virtual Order Order { get; set; } = default!;

    /// <summary>
    /// Order Id
    /// </summary>
    public Guid OrderId { get; set; }

    /// <summary>
    /// Line items shipped in this shipment
    /// </summary>
    public List<LineItem> LineItems { get; set; } = [];

    /// <summary>
    /// Address this shipment was sent to
    /// </summary>
    public Address Address { get; set; } = new();

    /// <summary>
    /// Courier Id
    /// </summary>
    public Guid CourierId { get; set; }

    /// <summary>
    /// Warehouse fulfilling this shipment
    /// </summary>
    public virtual Warehouse Warehouse { get; set; } = default!;

    /// <summary>
    /// Warehouse Id
    /// </summary>
    public Guid WarehouseId { get; set; }

    /// <summary>
    /// Tracking number for this shipment
    /// </summary>
    public string? TrackingNumber { get; set; }

    /// <summary>
    /// URL to track this shipment
    /// </summary>
    public string? TrackingUrl { get; set; }

    /// <summary>
    /// Carrier/courier name (e.g., "UPS", "FedEx", "DHL")
    /// </summary>
    public string? Carrier { get; set; }

    /// <summary>
    /// Requested delivery date from the order (for warehouse reference)
    /// </summary>
    public DateTime? RequestedDeliveryDate { get; set; }

    /// <summary>
    /// Whether the delivery date was guaranteed
    /// </summary>
    public bool? IsDeliveryDateGuaranteed { get; set; }

    /// <summary>
    /// Actual date delivered (from tracking or manual update)
    /// </summary>
    public DateTime? ActualDeliveryDate { get; set; }

    /// <summary>
    /// Date the shipment was created
    /// </summary>
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Current status of this shipment
    /// </summary>
    public ShipmentStatus Status { get; set; } = ShipmentStatus.Preparing;

    /// <summary>
    /// Date the shipment was handed to the carrier (set when status transitions to Shipped)
    /// </summary>
    public DateTime? ShippedDate { get; set; }
}
