using Merchello.Core.Accounting.Models;

namespace Merchello.Core.Shipping.Models;

public class ShippingLineItem
{
    public Guid LineItemId { get; set; }

    /// <summary>
    /// Variant name (e.g., "S-Grey"). Kept for backward compatibility.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Root product name (e.g., "Premium V-Neck").
    /// </summary>
    public string ProductRootName { get; set; } = string.Empty;

    /// <summary>
    /// Selected options for this variant (e.g., Color: Grey, Size: S).
    /// </summary>
    public List<SelectedOption> SelectedOptions { get; set; } = [];

    public string? Sku { get; set; }
    public int Quantity { get; set; }
    public decimal Amount { get; set; }
}

