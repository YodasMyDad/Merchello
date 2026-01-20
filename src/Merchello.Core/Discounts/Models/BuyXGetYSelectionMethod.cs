using System.Text.Json.Serialization;

namespace Merchello.Core.Discounts.Models;

/// <summary>
/// How to select items for the "Get" portion of Buy X Get Y discounts.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum BuyXGetYSelectionMethod
{
    /// <summary>
    /// Discount the cheapest qualifying items first.
    /// </summary>
    Cheapest,

    /// <summary>
    /// Discount the most expensive qualifying items first.
    /// </summary>
    MostExpensive
}
