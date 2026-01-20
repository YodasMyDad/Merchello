using System.Text.Json.Serialization;

namespace Merchello.Core.Customers.Models;

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
