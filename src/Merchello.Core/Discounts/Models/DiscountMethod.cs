using System.Text.Json.Serialization;

namespace Merchello.Core.Discounts.Models;

/// <summary>
/// How the discount is applied.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum DiscountMethod
{
    /// <summary>
    /// Customer must enter a discount code.
    /// </summary>
    Code,

    /// <summary>
    /// Discount is automatically applied when conditions are met.
    /// </summary>
    Automatic
}
