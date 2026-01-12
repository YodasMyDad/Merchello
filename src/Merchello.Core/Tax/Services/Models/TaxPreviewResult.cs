namespace Merchello.Core.Tax.Services.Models;

/// <summary>
/// Result of a simple tax preview calculation.
/// Used by UI components to preview tax before adding items.
/// </summary>
public class TaxPreviewResult
{
    /// <summary>
    /// Subtotal before tax (price * quantity).
    /// </summary>
    public decimal Subtotal { get; init; }

    /// <summary>
    /// Tax rate applied as a percentage.
    /// </summary>
    public decimal TaxRate { get; init; }

    /// <summary>
    /// Calculated tax amount.
    /// </summary>
    public decimal TaxAmount { get; init; }

    /// <summary>
    /// Total including tax (subtotal + tax amount).
    /// </summary>
    public decimal Total { get; init; }
}
