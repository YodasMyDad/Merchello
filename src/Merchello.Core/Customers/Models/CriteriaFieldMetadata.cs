namespace Merchello.Core.Customers.Models;

/// <summary>
/// Metadata about an available criteria field.
/// </summary>
public class CriteriaFieldMetadata
{
    /// <summary>
    /// The field identifier.
    /// </summary>
    public SegmentCriteriaField Field { get; set; }

    /// <summary>
    /// Display label for the field.
    /// </summary>
    public string Label { get; set; } = string.Empty;

    /// <summary>
    /// Description of what the field represents.
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// The data type of the field value.
    /// </summary>
    public CriteriaValueType ValueType { get; set; }

    /// <summary>
    /// Operators supported by this field.
    /// </summary>
    public List<SegmentCriteriaOperator> SupportedOperators { get; set; } = [];
}
