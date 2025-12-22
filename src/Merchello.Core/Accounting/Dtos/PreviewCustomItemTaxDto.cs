namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Request DTO for previewing tax calculation on a custom item
/// </summary>
public class PreviewCustomItemTaxRequestDto
{
    /// <summary>
    /// Unit price of the custom item
    /// </summary>
    public decimal Price { get; set; }

    /// <summary>
    /// Quantity of items
    /// </summary>
    public int Quantity { get; set; }

    /// <summary>
    /// Tax group ID (null for no tax)
    /// </summary>
    public Guid? TaxGroupId { get; set; }
}

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
