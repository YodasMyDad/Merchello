using Merchello.Core.Checkout.Dtos;

namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Line item data for editing
/// </summary>
public class LineItemForEditDto
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public string? Sku { get; set; }

    /// <summary>
    /// The variant name (e.g., "S-Grey"). Kept for backward compatibility.
    /// For display, prefer ProductRootName with SelectedOptions.
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// The root product name (e.g., "Premium V-Neck").
    /// </summary>
    public string ProductRootName { get; set; } = "";

    /// <summary>
    /// Selected options for this variant (e.g., Color: Grey, Size: S).
    /// </summary>
    public List<SelectedOptionDto> SelectedOptions { get; set; } = [];

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

    /// <summary>
    /// Child add-on line items linked to this parent product
    /// </summary>
    public List<LineItemForEditDto> ChildLineItems { get; set; } = [];

    /// <summary>
    /// The parent line item SKU if this is a child add-on item
    /// </summary>
    public string? ParentLineItemSku { get; set; }

    /// <summary>
    /// Whether this line item represents an add-on (non-variant option value)
    /// </summary>
    public bool IsAddon { get; set; }
}

