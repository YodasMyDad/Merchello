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
