namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// Summary of a shipment for the confirmation page.
/// </summary>
public class ShipmentSummaryDto
{
    /// <summary>
    /// Name of the shipping method (e.g., "Standard Shipping").
    /// </summary>
    public string ShippingMethodName { get; set; } = "";

    /// <summary>
    /// Estimated delivery description (e.g., "5-7 business days").
    /// </summary>
    public string? DeliveryEstimate { get; set; }

    /// <summary>
    /// Shipping cost for this shipment.
    /// </summary>
    public decimal Cost { get; set; }

    /// <summary>
    /// Formatted shipping cost.
    /// </summary>
    public string FormattedCost { get; set; } = "";
}
