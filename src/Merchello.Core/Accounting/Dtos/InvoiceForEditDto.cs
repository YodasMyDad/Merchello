namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Invoice data for editing (includes all editable fields)
/// </summary>
public class InvoiceForEditDto
{
    public Guid Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public string FulfillmentStatus { get; set; } = string.Empty;
    public bool CanEdit { get; set; }
    public string? CannotEditReason { get; set; }
    public string CurrencySymbol { get; set; } = "£";
    public string CurrencyCode { get; set; } = "GBP";

    /// <summary>
    /// All orders with their line items
    /// </summary>
    public List<OrderForEditDto> Orders { get; set; } = [];

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

