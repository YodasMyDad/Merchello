namespace Merchello.Core.ExchangeRates.Dtos;

/// <summary>
/// Configuration field definition for dynamic UI
/// </summary>
public class ExchangeRateProviderFieldDto
{
    public required string Key { get; set; }
    public required string Label { get; set; }
    public string? Description { get; set; }
    public required string FieldType { get; set; }
    public bool IsRequired { get; set; }
    public bool IsSensitive { get; set; }
    public string? DefaultValue { get; set; }
    public string? Placeholder { get; set; }
}
