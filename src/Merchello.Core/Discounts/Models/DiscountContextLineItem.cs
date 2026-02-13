namespace Merchello.Core.Discounts.Models;

/// <summary>
/// Represents a line item in the discount context with all necessary properties for target matching.
/// </summary>
public class DiscountContextLineItem
{
    /// <summary>
    /// The unique identifier of this line item.
    /// </summary>
    public Guid LineItemId { get; set; }

    /// <summary>
    /// The product variant ID.
    /// </summary>
    public Guid ProductId { get; set; }

    /// <summary>
    /// The product root ID (for matching at product level).
    /// </summary>
    public Guid ProductRootId { get; set; }

    /// <summary>
    /// The collection IDs this product belongs to.
    /// </summary>
    public List<Guid> CollectionIds { get; set; } = [];

    /// <summary>
    /// The product filter IDs this product matches.
    /// </summary>
    public List<Guid> ProductFilterIds { get; set; } = [];

    /// <summary>
    /// The product type ID.
    /// </summary>
    public Guid? ProductTypeId { get; set; }

    /// <summary>
    /// The supplier ID.
    /// </summary>
    public Guid? SupplierId { get; set; }

    /// <summary>
    /// The warehouse ID.
    /// </summary>
    public Guid? WarehouseId { get; set; }

    /// <summary>
    /// The SKU of the product.
    /// </summary>
    public string Sku { get; set; } = string.Empty;

    /// <summary>
    /// The quantity of items.
    /// </summary>
    public int Quantity { get; set; }

    /// <summary>
    /// The unit price of the item.
    /// </summary>
    public decimal UnitPrice { get; set; }

    /// <summary>
    /// The total price for this line (Quantity * UnitPrice).
    /// </summary>
    public decimal LineTotal { get; set; }

    /// <summary>
    /// Whether this line item is taxable.
    /// </summary>
    public bool IsTaxable { get; set; }

    /// <summary>
    /// The tax rate percentage applied to this line item.
    /// </summary>
    public decimal TaxRate { get; set; }

    /// <summary>
    /// Whether this line item is an add-on (non-variant option selection).
    /// </summary>
    public bool IsAddon { get; set; }

    /// <summary>
    /// The parent product line item ID if this is an add-on.
    /// Used to link add-ons to their parent products for discount targeting.
    /// </summary>
    public Guid? ParentLineItemId { get; set; }
}
