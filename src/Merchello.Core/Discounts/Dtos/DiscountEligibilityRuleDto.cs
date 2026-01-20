using Merchello.Core.Discounts.Models;

namespace Merchello.Core.Discounts.Dtos;

/// <summary>
/// DTO for discount eligibility rules.
/// </summary>
public class DiscountEligibilityRuleDto
{
    public Guid Id { get; set; }
    public DiscountEligibilityType EligibilityType { get; set; }
    public List<Guid>? EligibilityIds { get; set; }
    public List<string>? EligibilityNames { get; set; }
}
