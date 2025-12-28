namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// DTO containing all data needed for the order confirmation page.
/// </summary>
public class OrderConfirmationDto
{
    /// <summary>
    /// The invoice ID.
    /// </summary>
    public Guid InvoiceId { get; set; }

    /// <summary>
    /// Human-readable invoice number (e.g., "INV-0001").
    /// </summary>
    public string InvoiceNumber { get; set; } = "";

    /// <summary>
    /// Date the order was placed.
    /// </summary>
    public DateTime OrderDate { get; set; }

    /// <summary>
    /// Customer's email address.
    /// </summary>
    public string CustomerEmail { get; set; } = "";

    /// <summary>
    /// Billing address.
    /// </summary>
    public CheckoutAddressDto BillingAddress { get; set; } = new();

    /// <summary>
    /// Shipping address.
    /// </summary>
    public CheckoutAddressDto ShippingAddress { get; set; } = new();

    /// <summary>
    /// All line items from the order (products only).
    /// </summary>
    public List<CheckoutLineItemDto> LineItems { get; set; } = [];

    /// <summary>
    /// Subtotal before discounts.
    /// </summary>
    public decimal SubTotal { get; set; }

    /// <summary>
    /// Formatted subtotal.
    /// </summary>
    public string FormattedSubTotal { get; set; } = "";

    /// <summary>
    /// Total discount amount.
    /// </summary>
    public decimal Discount { get; set; }

    /// <summary>
    /// Formatted discount.
    /// </summary>
    public string FormattedDiscount { get; set; } = "";

    /// <summary>
    /// Total shipping cost.
    /// </summary>
    public decimal Shipping { get; set; }

    /// <summary>
    /// Formatted shipping cost.
    /// </summary>
    public string FormattedShipping { get; set; } = "";

    /// <summary>
    /// Total tax amount.
    /// </summary>
    public decimal Tax { get; set; }

    /// <summary>
    /// Formatted tax.
    /// </summary>
    public string FormattedTax { get; set; } = "";

    /// <summary>
    /// Order total.
    /// </summary>
    public decimal Total { get; set; }

    /// <summary>
    /// Formatted order total.
    /// </summary>
    public string FormattedTotal { get; set; } = "";

    /// <summary>
    /// Currency symbol (e.g., "$", "£").
    /// </summary>
    public string CurrencySymbol { get; set; } = "";

    /// <summary>
    /// Shipping method information per order/shipment group.
    /// </summary>
    public List<ShipmentSummaryDto> Shipments { get; set; } = [];

    /// <summary>
    /// Payment method used (e.g., "Visa ending in 4242").
    /// </summary>
    public string? PaymentMethod { get; set; }
}

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
