using Merchello.Core.Discounts.Models;

namespace Merchello.Core.Discounts.Dtos;

/// <summary>
/// DTO for creating a target rule.
/// </summary>
public class CreateDiscountTargetRuleDto
{
    public DiscountTargetType TargetType { get; set; }
    public List<Guid>? TargetIds { get; set; }
    public bool IsExclusion { get; set; }
}
