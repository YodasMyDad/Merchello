namespace Merchello.Core.Settings.Dtos;

/// <summary>
/// Product option configuration settings
/// </summary>
public class ProductOptionSettingsDto
{
    /// <summary>
    /// Available option type aliases (e.g., "colour", "size", "material", "pattern")
    /// </summary>
    public string[] OptionTypeAliases { get; set; } = [];

    /// <summary>
    /// Available option UI aliases (e.g., "dropdown", "colour", "image", "checkbox", "radiobutton")
    /// </summary>
    public string[] OptionUiAliases { get; set; } = [];

    /// <summary>
    /// Maximum number of options allowed per product
    /// </summary>
    public int MaxProductOptions { get; set; }

    /// <summary>
    /// Maximum number of values allowed per option
    /// </summary>
    public int MaxOptionValuesPerOption { get; set; }
}
