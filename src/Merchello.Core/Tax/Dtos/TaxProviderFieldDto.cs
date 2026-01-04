namespace Merchello.Core.Tax.Dtos;

/// <summary>
/// DTO for tax provider configuration field.
/// </summary>
public class TaxProviderFieldDto
{
    public required string Key { get; init; }
    public required string Label { get; init; }
    public string? Description { get; init; }
    public required string FieldType { get; init; }
    public bool IsRequired { get; init; }
    public bool IsSensitive { get; init; }
    public string? DefaultValue { get; init; }
    public string? Placeholder { get; init; }
    public List<TaxProviderFieldOptionDto>? Options { get; init; }
}

/// <summary>
/// DTO for select option in a configuration field.
/// </summary>
public class TaxProviderFieldOptionDto
{
    public required string Value { get; init; }
    public required string Label { get; init; }
}
