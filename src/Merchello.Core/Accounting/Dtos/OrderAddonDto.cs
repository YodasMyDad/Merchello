namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// A selected add-on option value for a product
/// </summary>
public class OrderAddonDto
{
    /// <summary>
    /// The option ID (ProductOption.Id)
    /// </summary>
    public Guid OptionId { get; set; }

    /// <summary>
    /// The option value ID (ProductOptionValue.Id)
    /// </summary>
    public Guid OptionValueId { get; set; }

    /// <summary>
    /// Display name for the add-on (e.g., "Gift Wrap: Premium")
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Price adjustment to add to the base product price
    /// </summary>
    public decimal PriceAdjustment { get; set; }

    /// <summary>
    /// Cost adjustment for this add-on (for profit calculations)
    /// </summary>
    public decimal CostAdjustment { get; set; }

    /// <summary>
    /// SKU suffix to append to the parent product SKU
    /// </summary>
    public string? SkuSuffix { get; set; }

    /// <summary>
    /// Additional weight in kilograms for shipping calculations
    /// </summary>
    public decimal? WeightKg { get; set; }

    /// <summary>
    /// Additional length in centimeters for shipping calculations
    /// </summary>
    public decimal? LengthCm { get; set; }

    /// <summary>
    /// Additional width in centimeters for shipping calculations
    /// </summary>
    public decimal? WidthCm { get; set; }

    /// <summary>
    /// Additional height in centimeters for shipping calculations
    /// </summary>
    public decimal? HeightCm { get; set; }
}
