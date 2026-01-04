using Merchello.Core.Shipping.Providers;

namespace Merchello.Core.Tax.Providers.Models;

/// <summary>
/// Defines a configuration field for tax provider settings UI.
/// </summary>
public class TaxProviderConfigurationField
{
    public required string Key { get; init; }
    public required string Label { get; init; }
    public string? Description { get; init; }
    public required ConfigurationFieldType FieldType { get; init; }
    public bool IsRequired { get; init; } = true;
    public bool IsSensitive { get; init; } = false;
    public string? DefaultValue { get; init; }
    public string? Placeholder { get; init; }
    public IReadOnlyList<SelectOption>? Options { get; init; }
}
