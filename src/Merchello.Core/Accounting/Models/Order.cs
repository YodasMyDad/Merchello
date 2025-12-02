using Merchello.Core.Locality.Models;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Accounting.Models;

public class Order
{
    /// <summary>
    /// Order Id
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// The invoice id
    /// </summary>
    public Guid InvoiceId { get; set; }

    /// <summary>
    /// Invoice this order is part of
    /// </summary>
    public Invoice? Invoice { get; set; }

    /// <summary>
    /// Warehouse this order ships from
    /// </summary>
    public Guid WarehouseId { get; set; }

    /// <summary>
    /// The selected shipping option/method for this order
    /// </summary>
    public Guid ShippingOptionId { get; set; }

    /// <summary>
    /// Shipping cost for this order
    /// </summary>
    public decimal ShippingCost { get; set; }

    /// <summary>
    /// Customer's requested delivery date (if applicable)
    /// </summary>
    public DateTime? RequestedDeliveryDate { get; set; }

    /// <summary>
    /// Whether the delivery date is guaranteed or best effort
    /// Copied from ShippingOption at time of order creation
    /// </summary>
    public bool? IsDeliveryDateGuaranteed { get; set; }

    /// <summary>
    /// Additional surcharge for the selected delivery date (if any)
    /// Included in ShippingCost but stored separately for transparency
    /// </summary>
    public decimal? DeliveryDateSurcharge { get; set; }

    /// <summary>
    /// Line items on the order
    /// </summary>
    public virtual ICollection<LineItem>? LineItems { get; set; }

    /// <summary>
    /// Shipments on this order
    /// </summary>
    public virtual ICollection<Shipment>? Shipments { get; set; }

    /// <summary>
    /// Current status of the order
    /// </summary>
    public OrderStatus Status { get; set; } = OrderStatus.Pending;

    /// <summary>
    /// Date when order processing started
    /// </summary>
    public DateTime? ProcessingStartedDate { get; set; }

    /// <summary>
    /// Date when all items were shipped
    /// </summary>
    public DateTime? ShippedDate { get; set; }

    /// <summary>
    /// Date when order was completed/delivered
    /// </summary>
    public DateTime? CompletedDate { get; set; }

    /// <summary>
    /// Date when order was cancelled
    /// </summary>
    public DateTime? CancelledDate { get; set; }

    /// <summary>
    /// Reason for cancellation (if applicable)
    /// </summary>
    public string? CancellationReason { get; set; }

    /// <summary>
    /// Internal notes for warehouse staff or admin
    /// </summary>
    public string? InternalNotes { get; set; }

    /// <summary>
    /// Date created
    /// </summary>
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Date updated
    /// </summary>
    public DateTime DateUpdated { get; set; } = DateTime.UtcNow;
}
