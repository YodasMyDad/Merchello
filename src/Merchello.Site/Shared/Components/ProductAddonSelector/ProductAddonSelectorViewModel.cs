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
