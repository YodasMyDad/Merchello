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

    // Display currency fields (customer's selected currency)

    /// <summary>
    /// Display currency code (e.g., "GBP", "EUR").
    /// </summary>
    public string DisplayCurrencyCode { get; set; } = "";

    /// <summary>
    /// Display currency symbol (e.g., "£", "€").
    /// </summary>
    public string DisplayCurrencySymbol { get; set; } = "";

    /// <summary>
    /// Exchange rate from store currency to display currency.
    /// </summary>
    public decimal ExchangeRate { get; set; } = 1m;

    /// <summary>
    /// Subtotal in display currency.
    /// </summary>
    public decimal DisplaySubTotal { get; set; }

    /// <summary>
    /// Formatted subtotal in display currency.
    /// </summary>
    public string FormattedDisplaySubTotal { get; set; } = "";

    /// <summary>
    /// Discount in display currency.
    /// </summary>
    public decimal DisplayDiscount { get; set; }

    /// <summary>
    /// Formatted discount in display currency.
    /// </summary>
    public string FormattedDisplayDiscount { get; set; } = "";

    /// <summary>
    /// Shipping cost in display currency.
    /// </summary>
    public decimal DisplayShipping { get; set; }

    /// <summary>
    /// Formatted shipping cost in display currency.
    /// </summary>
    public string FormattedDisplayShipping { get; set; } = "";

    /// <summary>
    /// Tax in display currency.
    /// </summary>
    public decimal DisplayTax { get; set; }

    /// <summary>
    /// Formatted tax in display currency.
    /// </summary>
    public string FormattedDisplayTax { get; set; } = "";

    /// <summary>
    /// Total in display currency.
    /// </summary>
    public decimal DisplayTotal { get; set; }

    /// <summary>
    /// Formatted total in display currency.
    /// </summary>
    public string FormattedDisplayTotal { get; set; } = "";

    // Tax-inclusive display (when DisplayPricesIncTax setting is enabled)

    /// <summary>
    /// Whether prices are displayed including tax.
    /// </summary>
    public bool DisplayPricesIncTax { get; set; }

    /// <summary>
    /// Subtotal including tax in display currency (for tax-inclusive display).
    /// </summary>
    public decimal TaxInclusiveDisplaySubTotal { get; set; }

    /// <summary>
    /// Formatted subtotal including tax in display currency.
    /// </summary>
    public string FormattedTaxInclusiveDisplaySubTotal { get; set; } = "";

    /// <summary>
    /// Tax included message (e.g., "Including £10.17 in taxes").
    /// </summary>
    public string? TaxIncludedMessage { get; set; }

    /// <summary>
    /// The effective shipping tax rate calculated for this invoice (for proportional/weighted mode).
    /// Used to display tax-inclusive shipping when no specific rate is configured.
    /// Null if shipping is not taxable or a specific rate was used from the tax provider.
    /// </summary>
    public decimal? EffectiveShippingTaxRate { get; set; }

    /// <summary>
    /// Shipping method information per order/shipment group.
    /// </summary>
    public List<ShipmentSummaryDto> Shipments { get; set; } = [];

    /// <summary>
    /// Payment method used (e.g., "Visa ending in 4242").
    /// </summary>
    public string? PaymentMethod { get; set; }

    /// <summary>
    /// Whether the order has been cancelled.
    /// </summary>
    public bool IsCancelled { get; set; }

    /// <summary>
    /// Reason for cancellation if cancelled.
    /// </summary>
    public string? CancellationReason { get; set; }

    /// <summary>
    /// Whether the order has been fully refunded.
    /// </summary>
    public bool IsRefunded { get; set; }
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
