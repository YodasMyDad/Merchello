using Merchello.Core.Customers.Models;

namespace Merchello.Core.Customers.Dtos;

/// <summary>
/// Metadata about an available criteria field.
/// </summary>
public class CriteriaFieldMetadataDto
{
    public string Field { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public CriteriaValueType ValueType { get; set; }
    public List<string> SupportedOperators { get; set; } = [];
}
