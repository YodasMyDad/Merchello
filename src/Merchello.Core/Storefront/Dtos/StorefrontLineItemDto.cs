using Merchello.Core.Checkout.Dtos;

namespace Merchello.Core.Storefront.Dtos;

/// <summary>
/// Line item in basket with multi-currency support
/// </summary>
public class StorefrontLineItemDto
{
    public Guid Id { get; set; }
    public string Sku { get; set; } = "";

    /// <summary>
    /// The variant name (e.g., "S-Grey"). Kept for backward compatibility.
    /// For display, prefer ProductRootName with SelectedOptions.
    /// </summary>
    public string Name { get; set; } = "";

    /// <summary>
    /// The root product name (e.g., "Premium V-Neck").
    /// </summary>
    public string ProductRootName { get; set; } = "";

    /// <summary>
    /// Selected options for this variant (e.g., Color: Grey, Size: S).
    /// </summary>
    public List<SelectedOptionDto> SelectedOptions { get; set; } = [];

    public int Quantity { get; set; }

    // Store currency amounts
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
    public string FormattedUnitPrice { get; set; } = "";
    public string FormattedLineTotal { get; set; } = "";

    // Display amounts (in customer's selected currency)
    public decimal DisplayUnitPrice { get; set; }
    public decimal DisplayLineTotal { get; set; }
    public string FormattedDisplayUnitPrice { get; set; } = "";
    public string FormattedDisplayLineTotal { get; set; } = "";

    // Tax info (for tax-inclusive display calculations)
    public decimal TaxRate { get; set; }
    public bool IsTaxable { get; set; }

    public string LineItemType { get; set; } = "";
    public string? DependantLineItemSku { get; set; }
}
