namespace Merchello.Core.Products.Services.Parameters;

/// <summary>
/// Parameters for a single product option value
/// </summary>
public class ProductOptionValueParameters
{
    /// <summary>
    /// Value name
    /// </summary>
    public required string Name { get; init; }

    /// <summary>
    /// Full display name
    /// </summary>
    public string? FullName { get; init; }

    /// <summary>
    /// Sort order
    /// </summary>
    public int SortOrder { get; init; }

    /// <summary>
    /// Hex color value (for color options)
    /// </summary>
    public string? HexValue { get; init; }

    /// <summary>
    /// Price adjustment for this value
    /// </summary>
    public decimal PriceAdjustment { get; init; }

    /// <summary>
    /// Cost adjustment for this value
    /// </summary>
    public decimal CostAdjustment { get; init; }

    /// <summary>
    /// SKU suffix for this value
    /// </summary>
    public string? SkuSuffix { get; init; }

    /// <summary>
    /// Weight in kilograms
    /// </summary>
    public decimal? WeightKg { get; init; }
}
