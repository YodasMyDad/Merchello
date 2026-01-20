using System.Text.Json.Serialization;

namespace Merchello.Core.Discounts.Models;

/// <summary>
/// Who is eligible to use the discount.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum DiscountEligibilityType
{
    /// <summary>
    /// All customers are eligible.
    /// </summary>
    AllCustomers,

    /// <summary>
    /// Only customers in specific segments are eligible.
    /// </summary>
    CustomerSegments,

    /// <summary>
    /// Only specific customers are eligible.
    /// </summary>
    SpecificCustomers
}
