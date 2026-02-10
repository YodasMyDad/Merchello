namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// A custom add-on attached to a custom line item.
/// </summary>
public class CustomItemAddonDto
{
    /// <summary>
    /// Add-on key/name (for example "Drawers")
    /// </summary>
    public string Key { get; set; } = string.Empty;

    /// <summary>
    /// Add-on value (for example "Left side")
    /// </summary>
    public string Value { get; set; } = string.Empty;

    /// <summary>
    /// Price adjustment per unit to add to the parent custom item.
    /// </summary>
    public decimal PriceAdjustment { get; set; }

    /// <summary>
    /// Cost adjustment per unit for profit calculations.
    /// </summary>
    public decimal CostAdjustment { get; set; }

    /// <summary>
    /// Optional SKU suffix to append to the parent SKU.
    /// </summary>
    public string? SkuSuffix { get; set; }
}
