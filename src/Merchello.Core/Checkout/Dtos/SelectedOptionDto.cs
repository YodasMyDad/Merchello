namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// Represents a selected product option for API responses (e.g., Color: Grey).
/// </summary>
public class SelectedOptionDto
{
    /// <summary>
    /// The name of the option (e.g., "Color", "Size").
    /// </summary>
    public string OptionName { get; set; } = "";

    /// <summary>
    /// The selected value name (e.g., "Grey", "S").
    /// </summary>
    public string ValueName { get; set; } = "";
}
