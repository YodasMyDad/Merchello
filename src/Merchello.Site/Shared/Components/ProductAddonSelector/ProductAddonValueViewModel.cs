namespace Merchello.Site.Shared.Components.ProductAddonSelector;

/// <summary>
/// ViewModel for a single add-on option value.
/// </summary>
public class ProductAddonValueViewModel
{
    /// <summary>
    /// The value ID.
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// The display name.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Price adjustment for this add-on in store currency (can be positive or negative).
    /// </summary>
    public decimal PriceAdjustment { get; set; }

    /// <summary>
    /// Price adjustment converted to customer's display currency.
    /// </summary>
    public decimal DisplayPriceAdjustment { get; set; }

    /// <summary>
    /// Hex color value for colour swatches (e.g., "#FF0000").
    /// </summary>
    public string? HexValue { get; set; }

    /// <summary>
    /// Media URL for image swatches.
    /// </summary>
    public string? MediaUrl { get; set; }

    /// <summary>
    /// Gets the formatted price label (e.g., "+£5.00" or "-£2.00").
    /// </summary>
    public string GetPriceLabel(string currencySymbol, int decimalPlaces)
    {
        if (DisplayPriceAdjustment == 0) return "";
        var sign = DisplayPriceAdjustment > 0 ? "+" : "";
        var format = $"N{decimalPlaces}";
        return $" ({sign}{currencySymbol}{DisplayPriceAdjustment.ToString(format)})";
    }
}
