using System.Text.Json;

namespace Merchello.Core.Discounts.Models;

/// <summary>
/// Defines who is eligible to use a discount.
/// </summary>
public class DiscountEligibilityRule
{
    /// <summary>
    /// The type of eligibility (AllCustomers, CustomerSegments, or SpecificCustomers).
    /// </summary>
    public DiscountEligibilityType EligibilityType { get; set; }

    /// <summary>
    /// JSON array of segment IDs or customer IDs.
    /// Null when EligibilityType is AllCustomers.
    /// </summary>
    public string? EligibilityIds { get; set; }

    /// <summary>
    /// Gets the eligibility IDs as a list of Guids.
    /// </summary>
    public List<Guid> GetEligibilityIdsList()
    {
        if (string.IsNullOrEmpty(EligibilityIds))
            return [];

        try
        {
            return JsonSerializer.Deserialize<List<Guid>>(EligibilityIds) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }
}
