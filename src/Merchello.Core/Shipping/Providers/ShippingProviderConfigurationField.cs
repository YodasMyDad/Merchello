namespace Merchello.Core.Shipping.Providers;

/// <summary>
/// Defines a configuration field for a shipping provider.
/// Used to generate dynamic configuration UI in the backoffice.
/// </summary>
public class ShippingProviderConfigurationField
{
    /// <summary>
    /// Unique key for the field (used in configuration storage).
    /// </summary>
    public required string Key { get; init; }

    /// <summary>
    /// Display label shown in UI.
    /// </summary>
    public required string Label { get; init; }

    /// <summary>
    /// Optional description/help text for the field.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Type of input field to render.
    /// </summary>
    public required ConfigurationFieldType FieldType { get; init; }

    /// <summary>
    /// Whether this field is required.
    /// </summary>
    public bool IsRequired { get; init; } = true;

    /// <summary>
    /// Whether this field contains sensitive data (API keys, secrets).
    /// Sensitive fields should be masked in UI and encrypted at rest.
    /// </summary>
    public bool IsSensitive { get; init; } = false;

    /// <summary>
    /// Default value for the field.
    /// </summary>
    public string? DefaultValue { get; init; }

    /// <summary>
    /// Placeholder text for text inputs.
    /// </summary>
    public string? Placeholder { get; init; }

    /// <summary>
    /// Options for Select field type.
    /// </summary>
    public IEnumerable<SelectOption>? Options { get; init; }
}
