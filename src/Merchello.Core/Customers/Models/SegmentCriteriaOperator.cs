namespace Merchello.Core.Customers.Models;

/// <summary>
/// Operators for comparing criterion values.
/// </summary>
public enum SegmentCriteriaOperator
{
    Equals,
    NotEquals,
    GreaterThan,
    GreaterThanOrEqual,
    LessThan,
    LessThanOrEqual,
    Between,
    Contains,
    NotContains,
    StartsWith,
    EndsWith,
    IsEmpty,
    IsNotEmpty
}
