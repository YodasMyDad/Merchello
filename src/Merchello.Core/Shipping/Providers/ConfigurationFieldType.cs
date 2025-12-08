namespace Merchello.Core.Shipping.Providers;

/// <summary>
/// Types of configuration fields for shipping provider settings UI.
/// </summary>
public enum ConfigurationFieldType
{
    /// <summary>
    /// Single-line text input.
    /// </summary>
    Text,

    /// <summary>
    /// Password/masked text input.
    /// </summary>
    Password,

    /// <summary>
    /// Multi-line text input.
    /// </summary>
    Textarea,

    /// <summary>
    /// Boolean checkbox.
    /// </summary>
    Checkbox,

    /// <summary>
    /// Dropdown select.
    /// </summary>
    Select,

    /// <summary>
    /// URL input with validation.
    /// </summary>
    Url,

    /// <summary>
    /// Numeric input (integers).
    /// </summary>
    Number,

    /// <summary>
    /// Currency/decimal input with formatting.
    /// </summary>
    Currency,

    /// <summary>
    /// Percentage input (0-100).
    /// </summary>
    Percentage
}
