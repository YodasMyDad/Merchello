namespace Merchello.Site.Shared.Components.ProductAddonSelector;

/// <summary>
/// ViewModel for rendering a product add-on option selector.
/// </summary>
public class ProductAddonSelectorViewModel
{
    /// <summary>
    /// The option ID.
    /// </summary>
    public string OptionId { get; set; } = string.Empty;

    /// <summary>
    /// The display name for the option.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// The UI type to render (checkbox, dropdown, colour, image, radiobutton).
    /// </summary>
    public string UiType { get; set; } = "checkbox";

    /// <summary>
    /// Whether to use a swiper for many values (> 6).
    /// </summary>
    public bool UseSwiper { get; set; }

    /// <summary>
    /// The currency symbol for price display.
    /// </summary>
    public string CurrencySymbol { get; set; } = "£";

    /// <summary>
    /// Number of decimal places for price formatting.
    /// </summary>
    public int DecimalPlaces { get; set; } = 2;

    /// <summary>
    /// Whether prices include tax (for display purposes).
    /// </summary>
    public bool IncludesTax { get; set; }

    /// <summary>
    /// The option values to display.
    /// </summary>
    public List<ProductAddonValueViewModel> Values { get; set; } = [];
}

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
