using Merchello.Core.Discounts.Models;

namespace Merchello.Core.Discounts.Services.Parameters;

/// <summary>
/// Parameters for creating a discount eligibility rule.
/// </summary>
public class CreateDiscountEligibilityRuleParameters
{
    /// <summary>
    /// The type of eligibility.
    /// </summary>
    public DiscountEligibilityType EligibilityType { get; set; }

    /// <summary>
    /// The eligibility IDs (segment IDs or customer IDs).
    /// </summary>
    public List<Guid>? EligibilityIds { get; set; }
}
