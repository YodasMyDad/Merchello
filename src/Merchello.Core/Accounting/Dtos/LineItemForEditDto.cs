namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Line item data for editing
/// </summary>
public class LineItemForEditDto
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public string? Sku { get; set; }
    public string? Name { get; set; }
    public Guid? ProductId { get; set; }
    public int Quantity { get; set; }
    public decimal Amount { get; set; }
    public decimal? OriginalAmount { get; set; }
    public string? ImageUrl { get; set; }
    public bool IsTaxable { get; set; }
    public decimal TaxRate { get; set; }
    public string LineItemType { get; set; } = "Product";

    /// <summary>
    /// Whether stock is tracked for this product
    /// </summary>
    public bool IsStockTracked { get; set; }

    /// <summary>
    /// Available stock (current stock - reserved) for quantity increase validation.
    /// Only populated for stock-tracked products.
    /// </summary>
    public int? AvailableStock { get; set; }

    /// <summary>
    /// Child discount line items for this item
    /// </summary>
    public List<DiscountLineItemDto> Discounts { get; set; } = [];
}

