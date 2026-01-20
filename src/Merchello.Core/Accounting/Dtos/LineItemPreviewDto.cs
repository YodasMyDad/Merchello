namespace Merchello.Core.Accounting.Dtos;

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
