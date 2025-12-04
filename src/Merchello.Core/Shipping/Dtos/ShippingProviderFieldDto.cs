namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// Configuration field for a shipping provider
/// </summary>
public class ShippingProviderFieldDto
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

