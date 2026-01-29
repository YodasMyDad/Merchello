using System.Text.Json;

namespace Merchello.Core.Upsells.Models;

/// <summary>
/// Defines who is eligible to see the upsell.
/// </summary>
public class UpsellEligibilityRule
{
    /// <summary>
    /// The type of eligibility (AllCustomers, CustomerSegments, or SpecificCustomers).
    /// </summary>
    public UpsellEligibilityType EligibilityType { get; set; }

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
