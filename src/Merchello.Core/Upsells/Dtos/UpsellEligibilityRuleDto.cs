using Merchello.Core.Upsells.Models;

namespace Merchello.Core.Upsells.Dtos;

/// <summary>
/// Eligibility rule with resolved display names for the admin UI.
/// </summary>
public class UpsellEligibilityRuleDto
{
    public UpsellEligibilityType EligibilityType { get; set; }
    public List<Guid>? EligibilityIds { get; set; }
    public List<string>? EligibilityNames { get; set; }
}
