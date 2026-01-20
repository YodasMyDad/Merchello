using Merchello.Core.Discounts.Models;

namespace Merchello.Core.Discounts.Dtos;

/// <summary>
/// DTO for creating an eligibility rule.
/// </summary>
public class CreateDiscountEligibilityRuleDto
{
    public DiscountEligibilityType EligibilityType { get; set; }
    public List<Guid>? EligibilityIds { get; set; }
}
