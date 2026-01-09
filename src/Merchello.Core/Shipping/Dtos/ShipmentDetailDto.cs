using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// Full shipment details for display
/// </summary>
public class ShipmentDetailDto
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }

    /// <summary>
    /// Current status of the shipment
    /// </summary>
    public ShipmentStatus Status { get; set; }

    /// <summary>
    /// Human-readable status label (e.g., "Preparing", "Shipped")
    /// </summary>
    public string StatusLabel { get; set; } = string.Empty;

    /// <summary>
    /// CSS class for status badge styling
    /// </summary>
    public string StatusCssClass { get; set; } = string.Empty;

    public string? Carrier { get; set; }
    public string? TrackingNumber { get; set; }
    public string? TrackingUrl { get; set; }
    public DateTime DateCreated { get; set; }

    /// <summary>
    /// Date the shipment was handed to the carrier
    /// </summary>
    public DateTime? ShippedDate { get; set; }

    public DateTime? ActualDeliveryDate { get; set; }
    public List<ShipmentLineItemDto> LineItems { get; set; } = [];

    /// <summary>
    /// Whether the shipment can be marked as shipped (status is Preparing)
    /// </summary>
    public bool CanMarkAsShipped { get; set; }

    /// <summary>
    /// Whether the shipment can be marked as delivered (status is Shipped)
    /// </summary>
    public bool CanMarkAsDelivered { get; set; }

    /// <summary>
    /// Whether the shipment can be cancelled (not in terminal state)
    /// </summary>
    public bool CanCancel { get; set; }
}
