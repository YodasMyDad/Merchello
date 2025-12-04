namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Edit details for an existing line item
/// </summary>
public class EditLineItemDto
{
    /// <summary>
    /// Line item ID to edit
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// New quantity (null = no change)
    /// </summary>
    public int? Quantity { get; set; }

    /// <summary>
    /// When quantity is decreased, whether to return the reduced quantity to stock.
    /// Default: true. Set to false for damaged/faulty items.
    /// </summary>
    public bool ReturnToStock { get; set; } = true;

    /// <summary>
    /// Discount to apply (creates child discount line item)
    /// </summary>
    public LineItemDiscountDto? Discount { get; set; }
}

