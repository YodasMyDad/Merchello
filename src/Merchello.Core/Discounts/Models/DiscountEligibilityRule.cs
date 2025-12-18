using System.Text.Json;
using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Discounts.Models;

/// <summary>
/// Defines who is eligible to use a discount.
/// </summary>
public class DiscountEligibilityRule
{
    /// <summary>
    /// Unique identifier for the eligibility rule.
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// The discount this rule belongs to.
    /// </summary>
    public Guid DiscountId { get; set; }

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
    /// Navigation property to the parent discount.
    /// </summary>
    public virtual Discount Discount { get; set; } = null!;

    /// <summary>
    /// Gets the eligibility IDs as a list of Guids.
    /// </summary>
    public List<Guid> GetEligibilityIdsList()
    {
        if (string.IsNullOrEmpty(EligibilityIds))
        {
            return [];
        }

        try
        {
            return JsonSerializer.Deserialize<List<Guid>>(EligibilityIds) ?? [];
        }
        catch (JsonException ex)
        {
            // Log warning - malformed JSON in EligibilityIds
            System.Diagnostics.Debug.WriteLine($"[DiscountEligibilityRule] Failed to deserialize EligibilityIds JSON for rule {Id}: {ex.Message}");
            return [];
        }
    }
}
