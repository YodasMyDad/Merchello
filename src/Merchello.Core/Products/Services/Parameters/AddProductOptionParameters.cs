namespace Merchello.Core.Products.Services.Parameters;

/// <summary>
/// Parameters for adding a product option
/// </summary>
public class AddProductOptionParameters
{
    /// <summary>
    /// Product root ID to add the option to
    /// </summary>
    public required Guid ProductRootId { get; init; }

    /// <summary>
    /// Option name
    /// </summary>
    public required string Name { get; init; }

    /// <summary>
    /// Option alias (URL-friendly identifier)
    /// </summary>
    public string? Alias { get; init; }

    /// <summary>
    /// Sort order for display
    /// </summary>
    public int SortOrder { get; init; }

    /// <summary>
    /// Option type alias (e.g., "color", "size")
    /// </summary>
    public string? OptionTypeAlias { get; init; }

    /// <summary>
    /// Option UI component alias
    /// </summary>
    public string? OptionUiAlias { get; init; }

    /// <summary>
    /// Whether this option creates variants (true) or is an add-on (false)
    /// </summary>
    public bool IsVariant { get; init; } = true;

    /// <summary>
    /// Option values
    /// </summary>
    public required List<ProductOptionValueParameters> Values { get; init; }
}

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
}
