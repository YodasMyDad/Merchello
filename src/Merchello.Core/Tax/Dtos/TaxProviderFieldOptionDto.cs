namespace Merchello.Core.Tax.Dtos;

/// <summary>
/// DTO for select option in a configuration field.
/// </summary>
public class TaxProviderFieldOptionDto
{
    public required string Value { get; init; }
    public required string Label { get; init; }
}
