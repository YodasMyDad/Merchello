using System.Text.Json.Serialization;

namespace Merchello.Core.Discounts.Models;

/// <summary>
/// Minimum requirement type for discount eligibility.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum DiscountRequirementType
{
    /// <summary>
    /// No minimum requirement.
    /// </summary>
    None,

    /// <summary>
    /// Minimum purchase amount required.
    /// </summary>
    MinimumPurchaseAmount,

    /// <summary>
    /// Minimum quantity of items required.
    /// </summary>
    MinimumQuantity
}
