namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Invoice data for editing (includes all editable fields)
/// </summary>
public class InvoiceForEditDto
{
    public Guid Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public string FulfillmentStatus { get; set; } = string.Empty;

    /// <summary>
    /// CSS class for fulfillment status styling (e.g., "unfulfilled", "partial", "fulfilled").
    /// Calculated by backend to avoid frontend logic duplication.
    /// </summary>
    public string FulfillmentStatusCssClass { get; set; } = "unfulfilled";

    public bool CanEdit { get; set; }
    public string? CannotEditReason { get; set; }
    public string CurrencySymbol { get; set; } = string.Empty;
    public string CurrencyCode { get; set; } = string.Empty;

    /// <summary>
    /// All orders with their line items
    /// </summary>
    public List<OrderForEditDto> Orders { get; set; } = [];

    /// <summary>
    /// Order-level discounts (coupons, etc.) not linked to specific line items.
    /// These can be viewed, removed, and supplemented via the edit modal.
    /// </summary>
    public List<DiscountLineItemDto> OrderDiscounts { get; set; } = [];

    /// <summary>
    /// Shipping address country code (for region validation when adding products)
    /// </summary>
    public string? ShippingCountryCode { get; set; }

    /// <summary>
    /// Shipping address region/state code (for region validation when adding products)
    /// </summary>
    public string? ShippingRegion { get; set; }

    /// <summary>
    /// Subtotal before discounts (products + custom items)
    /// </summary>
    public decimal SubTotal { get; set; }

    /// <summary>
    /// Total discount amount (always positive)
    /// </summary>
    public decimal DiscountTotal { get; set; }

    /// <summary>
    /// Subtotal after discounts (SubTotal - DiscountTotal)
    /// </summary>
    public decimal AdjustedSubTotal { get; set; }

    /// <summary>
    /// Total shipping cost across all orders
    /// </summary>
    public decimal ShippingTotal { get; set; }

    /// <summary>
    /// Tax amount
    /// </summary>
    public decimal Tax { get; set; }

    /// <summary>
    /// Grand total (AdjustedSubTotal + Tax + ShippingTotal)
    /// </summary>
    public decimal Total { get; set; }
}

