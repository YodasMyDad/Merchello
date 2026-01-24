namespace Merchello.Core.Shared.Providers;

/// <summary>
/// Types of configuration fields for provider settings UI.
/// Used by shipping, payment, tax, and fulfilment providers.
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
    Percentage,

    /// <summary>
    /// Tax group to provider code mapping grid.
    /// Renders a table of TaxGroups with text inputs for provider-specific codes.
    /// </summary>
    TaxGroupMapping
}
