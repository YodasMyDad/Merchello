using System.Text.Json.Serialization;

namespace Merchello.Core.Discounts.Models;

/// <summary>
/// The category/type of discount.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum DiscountCategory
{
    /// <summary>
    /// Discount applies to specific products or collections.
    /// </summary>
    AmountOffProducts,

    /// <summary>
    /// Buy X items, get Y items at a discount.
    /// </summary>
    BuyXGetY,

    /// <summary>
    /// Discount applies to the entire order total.
    /// </summary>
    AmountOffOrder,

    /// <summary>
    /// Free or discounted shipping.
    /// </summary>
    FreeShipping
}
