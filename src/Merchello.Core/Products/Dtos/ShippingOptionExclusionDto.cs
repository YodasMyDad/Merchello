namespace Merchello.Core.Products.Dtos;

/// <summary>
/// Represents a shipping option with its exclusion status for the product editing UI.
/// </summary>
public class ShippingOptionExclusionDto
{
    public Guid Id { get; set; }
    public string? Name { get; set; }
    public string? WarehouseName { get; set; }
    public string? ProviderKey { get; set; }

    /// <summary>
    /// True when ALL variants have this option excluded.
    /// </summary>
    public bool IsExcluded { get; set; }

    /// <summary>
    /// True when SOME (but not all) variants have this option excluded.
    /// UI should show indeterminate checkbox state.
    /// </summary>
    public bool IsPartiallyExcluded { get; set; }

    /// <summary>
    /// Number of variants that have this option excluded.
    /// </summary>
    public int ExcludedVariantCount { get; set; }

    /// <summary>
    /// Total number of variants for this product.
    /// </summary>
    public int TotalVariantCount { get; set; }
}
