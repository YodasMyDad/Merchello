namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Custom item to add to the invoice
/// </summary>
public class AddCustomItemDto
{
    /// <summary>
    /// Item name
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Unit price
    /// </summary>
    public decimal Price { get; set; }

    /// <summary>
    /// Quantity
    /// </summary>
    public int Quantity { get; set; } = 1;

    /// <summary>
    /// Tax group ID to apply to this item. If null, item is not taxable.
    /// </summary>
    public Guid? TaxGroupId { get; set; }

    /// <summary>
    /// Whether this is a physical product (affects shipping)
    /// </summary>
    public bool IsPhysicalProduct { get; set; } = true;
}

