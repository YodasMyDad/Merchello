namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// A shipping group representing items that will ship together from a warehouse.
/// Each group can have different shipping options based on product restrictions.
/// </summary>
public class ShippingGroupDto
{
    /// <summary>
    /// Unique identifier for this group (deterministic based on warehouse + shipping options).
    /// </summary>
    public Guid GroupId { get; set; }

    /// <summary>
    /// Display name (e.g., "Shipment from London Warehouse").
    /// </summary>
    public string GroupName { get; set; } = string.Empty;

    /// <summary>
    /// Warehouse ID (if applicable).
    /// </summary>
    public Guid? WarehouseId { get; set; }

    /// <summary>
    /// Line items in this group.
    /// </summary>
    public List<ShippingGroupLineItemDto> LineItems { get; set; } = [];

    /// <summary>
    /// Available shipping options for this group.
    /// </summary>
    public List<ShippingOptionDto> ShippingOptions { get; set; } = [];

    /// <summary>
    /// Currently selected shipping option ID (null if not yet selected).
    /// </summary>
    public Guid? SelectedShippingOptionId { get; set; }

    /// <summary>
    /// Selected delivery date (if applicable and supported by the shipping option).
    /// </summary>
    public DateTime? SelectedDeliveryDate { get; set; }
}

/// <summary>
/// A line item within a shipping group.
/// </summary>
public class ShippingGroupLineItemDto
{
    /// <summary>
    /// Line item ID from the basket.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Product SKU.
    /// </summary>
    public string Sku { get; set; } = string.Empty;

    /// <summary>
    /// Product name.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Quantity in this group (may be less than basket quantity if split across warehouses).
    /// </summary>
    public int Quantity { get; set; }

    /// <summary>
    /// Amount for items in this group.
    /// </summary>
    public decimal Amount { get; set; }

    /// <summary>
    /// Formatted amount.
    /// </summary>
    public string FormattedAmount { get; set; } = string.Empty;
}
