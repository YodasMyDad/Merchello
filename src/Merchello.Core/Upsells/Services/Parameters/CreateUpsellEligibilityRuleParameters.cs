using Merchello.Core.Upsells.Models;

namespace Merchello.Core.Upsells.Services.Parameters;

/// <summary>
/// Parameters for creating an upsell eligibility rule.
/// </summary>
public class CreateUpsellEligibilityRuleParameters
{
    public UpsellEligibilityType EligibilityType { get; set; }
    public List<Guid>? EligibilityIds { get; set; }
}
