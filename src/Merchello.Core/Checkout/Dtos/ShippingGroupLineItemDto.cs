namespace Merchello.Core.Checkout.Dtos;

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
    /// Variant name (e.g., "S-Grey"). Kept for backward compatibility.
    /// For display, prefer ProductRootName with SelectedOptions.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Root product name (e.g., "Premium V-Neck").
    /// </summary>
    public string ProductRootName { get; set; } = string.Empty;

    /// <summary>
    /// Selected options for this variant (e.g., Color: Grey, Size: S).
    /// </summary>
    public List<SelectedOptionDto> SelectedOptions { get; set; } = [];

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
