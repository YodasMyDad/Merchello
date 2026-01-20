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
