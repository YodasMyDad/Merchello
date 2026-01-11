using Merchello.Core.Checkout.Dtos;

namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Line item with fulfillment quantities
/// </summary>
public class FulfillmentLineItemDto
{
    public Guid Id { get; set; }
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

    public int OrderedQuantity { get; set; }
    public int ShippedQuantity { get; set; }
    public int RemainingQuantity => OrderedQuantity - ShippedQuantity;
    public string? ImageUrl { get; set; }
    public decimal Amount { get; set; }
}
