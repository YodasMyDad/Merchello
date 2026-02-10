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
    /// SKU for the custom item
    /// </summary>
    public string Sku { get; set; } = string.Empty;

    /// <summary>
    /// Unit price (selling price)
    /// </summary>
    public decimal Price { get; set; }

    /// <summary>
    /// Unit cost (for profit/loss calculations)
    /// </summary>
    public decimal Cost { get; set; }

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

    /// <summary>
    /// Warehouse ID for shipping grouping (required if IsPhysicalProduct is true)
    /// </summary>
    public Guid? WarehouseId { get; set; }

    /// <summary>
    /// Selected shipping option ID for this item.
    /// Null means "No Shipping" for physical custom items.
    /// </summary>
    public Guid? ShippingOptionId { get; set; }

    /// <summary>
    /// Optional add-ons linked to this custom item.
    /// </summary>
    public List<CustomItemAddonDto> Addons { get; set; } = [];
}

