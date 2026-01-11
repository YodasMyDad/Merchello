namespace Merchello.Core.Accounting.Models;

/// <summary>
/// Represents a selected product option for display purposes (e.g., Color: Grey).
/// </summary>
public class SelectedOption
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
