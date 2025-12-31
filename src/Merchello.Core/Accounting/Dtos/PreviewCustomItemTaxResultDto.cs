namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Result DTO for custom item tax preview calculation
/// </summary>
public class PreviewCustomItemTaxResultDto
{
    /// <summary>
    /// Subtotal (price * quantity)
    /// </summary>
    public decimal Subtotal { get; set; }

    /// <summary>
    /// Tax rate percentage applied
    /// </summary>
    public decimal TaxRate { get; set; }

    /// <summary>
    /// Calculated tax amount
    /// </summary>
    public decimal TaxAmount { get; set; }

    /// <summary>
    /// Total including tax
    /// </summary>
    public decimal Total { get; set; }
}
