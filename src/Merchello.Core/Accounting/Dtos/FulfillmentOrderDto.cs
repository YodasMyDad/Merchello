using Merchello.Core.Accounting.Models;
using Merchello.Core.Shipping.Dtos;

namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Fulfillment order (warehouse-level order)
/// </summary>
public class FulfillmentOrderDto
{
    public Guid Id { get; set; }
    public OrderStatus Status { get; set; }

    /// <summary>
    /// Human-readable status label (e.g., "Pending", "Shipped").
    /// Calculated by backend to avoid frontend logic duplication.
    /// </summary>
    public string StatusLabel { get; set; } = string.Empty;

    /// <summary>
    /// CSS class for status badge styling (e.g., "unfulfilled", "shipped", "cancelled").
    /// Calculated by backend to avoid frontend logic duplication.
    /// </summary>
    public string StatusCssClass { get; set; } = string.Empty;

    public List<LineItemDto> LineItems { get; set; } = [];
    public List<ShipmentDto> Shipments { get; set; } = [];
    public string DeliveryMethod { get; set; } = string.Empty;
    public decimal ShippingCost { get; set; }

    // Fulfilment Provider Information

    /// <summary>
    /// Provider key (e.g., "shipbob", "shipmonk"). Null if manual fulfilment.
    /// </summary>
    public string? FulfilmentProviderKey { get; set; }

    /// <summary>
    /// Provider display name (e.g., "ShipBob", "ShipMonk"). Null if manual fulfilment.
    /// </summary>
    public string? FulfilmentProviderName { get; set; }

    /// <summary>
    /// 3PL's order reference (e.g., "SB-12345"). Null if not yet submitted or manual fulfilment.
    /// </summary>
    public string? FulfilmentProviderReference { get; set; }

    /// <summary>
    /// When the order was submitted to the fulfilment provider.
    /// </summary>
    public DateTime? FulfilmentSubmittedAt { get; set; }

    /// <summary>
    /// Error message if fulfilment submission failed.
    /// </summary>
    public string? FulfilmentErrorMessage { get; set; }

    /// <summary>
    /// Number of fulfilment submission retry attempts.
    /// </summary>
    public int FulfilmentRetryCount { get; set; }

    /// <summary>
    /// Supplier Direct submission trigger for this order context ("OnPaid", "ExplicitRelease"), null for non-Supplier Direct.
    /// </summary>
    public string? SupplierDirectSubmissionTrigger { get; set; }

    /// <summary>
    /// Whether this order can be explicitly released to Supplier Direct now.
    /// </summary>
    public bool CanReleaseSupplierDirect { get; set; }
}
