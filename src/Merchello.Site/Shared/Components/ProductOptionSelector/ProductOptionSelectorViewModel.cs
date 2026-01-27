namespace Merchello.Site.Shared.Components.ProductOptionSelector;

/// <summary>
/// ViewModel for rendering a product variant option selector.
/// </summary>
public class ProductOptionSelectorViewModel
{
    /// <summary>
    /// The option ID.
    /// </summary>
    public string OptionId { get; set; } = string.Empty;

    /// <summary>
    /// The option alias used for Alpine.js binding.
    /// </summary>
    public string OptionAlias { get; set; } = string.Empty;

    /// <summary>
    /// The display name for the option.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// The UI type to render (dropdown, colour, image, radiobutton).
    /// </summary>
    public string UiType { get; set; } = "dropdown";

    /// <summary>
    /// Whether to use a swiper for many values (> 6).
    /// </summary>
    public bool UseSwiper { get; set; }

    /// <summary>
    /// The option values to display.
    /// </summary>
    public List<ProductOptionValueViewModel> Values { get; set; } = [];
}
