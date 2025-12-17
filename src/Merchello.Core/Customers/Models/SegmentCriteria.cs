namespace Merchello.Core.Customers.Models;

/// <summary>
/// A single criterion rule for automated segment evaluation.
/// </summary>
public class SegmentCriteria
{
    /// <summary>
    /// The field to evaluate (e.g., "OrderCount", "TotalSpend", "Tag").
    /// </summary>
    public string Field { get; set; } = string.Empty;

    /// <summary>
    /// The comparison operator.
    /// </summary>
    public SegmentCriteriaOperator Operator { get; set; }

    /// <summary>
    /// The value to compare against.
    /// </summary>
    public object? Value { get; set; }

    /// <summary>
    /// Second value for range operators like "Between".
    /// </summary>
    public object? Value2 { get; set; }
}

/// <summary>
/// A complete set of criteria rules with a match mode.
/// </summary>
public class SegmentCriteriaSet
{
    /// <summary>
    /// The list of criteria rules to evaluate.
    /// </summary>
    public List<SegmentCriteria> Criteria { get; set; } = [];

    /// <summary>
    /// How criteria are combined (All = AND, Any = OR).
    /// </summary>
    public SegmentMatchMode MatchMode { get; set; } = SegmentMatchMode.All;
}

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

/// <summary>
/// Result of validating criteria rules.
/// </summary>
public class CriteriaValidationResult
{
    /// <summary>
    /// Whether the criteria are valid.
    /// </summary>
    public bool IsValid { get; set; }

    /// <summary>
    /// Validation error messages.
    /// </summary>
    public List<string> Errors { get; set; } = [];

    /// <summary>
    /// Validation warning messages.
    /// </summary>
    public List<string> Warnings { get; set; } = [];
}
