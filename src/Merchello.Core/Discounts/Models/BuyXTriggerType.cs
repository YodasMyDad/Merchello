using System.Text.Json.Serialization;

namespace Merchello.Core.Discounts.Models;

/// <summary>
/// Trigger type for Buy X Get Y discounts.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum BuyXTriggerType
{
    /// <summary>
    /// Trigger based on minimum quantity of items.
    /// </summary>
    MinimumQuantity,

    /// <summary>
    /// Trigger based on minimum purchase amount.
    /// </summary>
    MinimumPurchaseAmount
}
