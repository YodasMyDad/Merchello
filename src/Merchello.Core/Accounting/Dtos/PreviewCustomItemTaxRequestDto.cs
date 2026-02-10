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

    /// <summary>
    /// Total add-on price adjustment per unit.
    /// </summary>
    public decimal AddonsTotal { get; set; }
}
