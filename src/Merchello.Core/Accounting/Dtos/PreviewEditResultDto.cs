namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Result of previewing invoice edit calculations.
/// All calculations are performed server-side - this is the single source of truth.
/// </summary>
public class PreviewEditResultDto
{
    public string CurrencyCode { get; set; } = string.Empty;
    public string CurrencySymbol { get; set; } = string.Empty;
    public string StoreCurrencyCode { get; set; } = string.Empty;
    public string StoreCurrencySymbol { get; set; } = string.Empty;
    public decimal? PricingExchangeRate { get; set; }

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
    /// Tax amount calculated on discounted amounts
    /// </summary>
    public decimal Tax { get; set; }

    /// <summary>
    /// Grand total (AdjustedSubTotal + Tax + ShippingTotal)
    /// </summary>
    public decimal Total { get; set; }
    public decimal? TotalInStoreCurrency { get; set; }

    /// <summary>
    /// Per-line-item calculated totals for display
    /// </summary>
    public List<LineItemPreviewDto> LineItems { get; set; } = [];

    /// <summary>
    /// Validation warnings (e.g., discount exceeds item value)
    /// </summary>
    public List<string> Warnings { get; set; } = [];
}

/// <summary>
/// Calculated values for a single line item
/// </summary>
public class LineItemPreviewDto
{
    /// <summary>
    /// Line item ID
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Calculated total for this line item (amount * quantity - discount)
    /// </summary>
    public decimal CalculatedTotal { get; set; }

    /// <summary>
    /// Discounted unit price (original unit price minus per-unit discount)
    /// </summary>
    public decimal DiscountedUnitPrice { get; set; }

    /// <summary>
    /// Calculated discount amount for this line item
    /// </summary>
    public decimal DiscountAmount { get; set; }

    /// <summary>
    /// Tax amount for this line item
    /// </summary>
    public decimal TaxAmount { get; set; }

    /// <summary>
    /// Whether the requested quantity increase exceeds available stock.
    /// Calculated by backend based on current stock levels and tracking settings.
    /// Frontend should use this instead of local stock validation logic.
    /// </summary>
    public bool HasInsufficientStock { get; set; }

    /// <summary>
    /// Whether a discount can be added to this line item.
    /// Backend determines this based on business rules (e.g., original discount was removed).
    /// Frontend should use this instead of local canModifyDiscount logic.
    /// </summary>
    public bool CanAddDiscount { get; set; }
}
