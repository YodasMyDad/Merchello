namespace Merchello.Core.Fulfilment.Dtos;

/// <summary>
/// Configuration field for dynamic UI generation.
/// </summary>
public class FulfilmentProviderConfigurationFieldDto
{
    public required string Key { get; set; }
    public required string Label { get; set; }
    public string? Description { get; set; }
    public required string FieldType { get; set; }
    public bool IsRequired { get; set; }
    public bool IsSensitive { get; set; }
    public string? DefaultValue { get; set; }
    public string? Placeholder { get; set; }
    public List<SelectOptionDto>? Options { get; set; }
}

/// <summary>
/// Select option for dropdown fields.
/// </summary>
public class SelectOptionDto
{
    public required string Value { get; set; }
    public required string Label { get; set; }
}
