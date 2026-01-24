using Merchello.Core.Discounts.Models;

namespace Merchello.Core.Discounts.Dtos;

/// <summary>
/// DTO for discount target rules.
/// </summary>
public class DiscountTargetRuleDto
{
    public DiscountTargetType TargetType { get; set; }
    public List<Guid>? TargetIds { get; set; }
    public List<string>? TargetNames { get; set; }
    public bool IsExclusion { get; set; }
}
