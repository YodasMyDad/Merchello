using System.Text.Json.Serialization;

namespace Merchello.Core.Accounting.Models;

/// <summary>
/// Type of discount value calculation
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum DiscountValueType
{
    /// <summary>
    /// Fixed amount discount (e.g., £5 off)
    /// </summary>
    FixedAmount,

    /// <summary>
    /// Percentage discount (e.g., 10% off)
    /// </summary>
    Percentage,

    /// <summary>
    /// Free (100% off, used for BuyXGetY discounts)
    /// </summary>
    Free
}
