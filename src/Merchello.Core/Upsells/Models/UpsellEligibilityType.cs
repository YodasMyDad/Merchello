using System.Text.Json.Serialization;

namespace Merchello.Core.Upsells.Models;

/// <summary>
/// Who is eligible to see the upsell.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum UpsellEligibilityType
{
    AllCustomers,
    CustomerSegments,
    SpecificCustomers
}
