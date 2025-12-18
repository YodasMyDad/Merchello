using System.Text.Json.Serialization;

namespace Merchello.Core.Customers.Models;

/// <summary>
/// The type of customer segment.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum CustomerSegmentType
{
    /// <summary>
    /// Manual segment - membership is explicitly set by adding/removing customers.
    /// </summary>
    Manual,

    /// <summary>
    /// Automated segment - membership is calculated dynamically based on criteria rules.
    /// </summary>
    Automated
}

/// <summary>
/// How multiple criteria are combined when evaluating segment membership.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum SegmentMatchMode
{
    /// <summary>
    /// All criteria must match (AND logic).
    /// </summary>
    All,

    /// <summary>
    /// Any criteria can match (OR logic).
    /// </summary>
    Any
}

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

/// <summary>
/// Available fields for segment criteria evaluation.
/// </summary>
public enum SegmentCriteriaField
{
    // Order metrics
    OrderCount,
    TotalSpend,
    AverageOrderValue,
    FirstOrderDate,
    LastOrderDate,
    DaysSinceLastOrder,

    // Customer properties
    DateCreated,
    Email,
    Country,

    // Custom
    Tag
}

/// <summary>
/// The data type of a criteria field value.
/// </summary>
public enum CriteriaValueType
{
    Number,
    String,
    Date,
    Boolean,
    Currency
}
