namespace Merchello.Core.Products.Models;

public class ProductOptionValue
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string? Name { get; set; }

    // Full name includes the parent name
    // Used when generating variant names
    public string? FullName { get; set; }
    public int SortOrder { get; set; }
    public string? HexValue { get; set; }
    public Guid? MediaKey { get; set; }

    /// <summary>
    /// Additional amount to add to the base product price when this value is selected.
    /// Positive increases price; negative decreases. Currency-agnostic decimal.
    /// Only used when parent option IsVariant == false.
    /// </summary>
    public decimal PriceAdjustment { get; set; }

    /// <summary>
    /// Additional amount to add to internal cost when this value is selected.
    /// Only used when parent option IsVariant == false.
    /// </summary>
    public decimal CostAdjustment { get; set; }

    /// <summary>
    /// Optional SKU suffix to append or use for a child line item when selected.
    /// Only used when parent option IsVariant == false.
    /// </summary>
    public string? SkuSuffix { get; set; }
}
