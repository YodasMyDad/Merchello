namespace Merchello.Site.Shared.Components.ProductOptionSelector;

/// <summary>
/// ViewModel for a single option value.
/// </summary>
public class ProductOptionValueViewModel
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
    /// Hex color value for colour swatches (e.g., "#FF0000").
    /// </summary>
    public string? HexValue { get; set; }

    /// <summary>
    /// Media URL for image swatches.
    /// </summary>
    public string? MediaUrl { get; set; }
}
