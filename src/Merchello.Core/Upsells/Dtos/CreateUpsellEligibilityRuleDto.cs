using Merchello.Core.Upsells.Models;

namespace Merchello.Core.Upsells.Dtos;

/// <summary>
/// Create eligibility rule within a create/update upsell request.
/// </summary>
public class CreateUpsellEligibilityRuleDto
{
    public UpsellEligibilityType EligibilityType { get; set; }
    public List<Guid>? EligibilityIds { get; set; }
}
