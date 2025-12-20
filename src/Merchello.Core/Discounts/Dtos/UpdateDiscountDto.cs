using Merchello.Core.Accounting.Models;
using Merchello.Core.Discounts.Models;

namespace Merchello.Core.Discounts.Dtos;

/// <summary>
/// DTO for updating a discount via API.
/// </summary>
public class UpdateDiscountDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Code { get; set; }
    public DiscountValueType? ValueType { get; set; }
    public decimal? Value { get; set; }
    public DateTime? StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }
    public bool ClearEndsAt { get; set; }
    public string? Timezone { get; set; }
    public int? TotalUsageLimit { get; set; }
    public bool ClearTotalUsageLimit { get; set; }
    public int? PerCustomerUsageLimit { get; set; }
    public bool ClearPerCustomerUsageLimit { get; set; }
    public int? PerOrderUsageLimit { get; set; }
    public bool ClearPerOrderUsageLimit { get; set; }
    public DiscountRequirementType? RequirementType { get; set; }
    public decimal? RequirementValue { get; set; }
    public bool? CanCombineWithProductDiscounts { get; set; }
    public bool? CanCombineWithOrderDiscounts { get; set; }
    public bool? CanCombineWithShippingDiscounts { get; set; }
    public bool? ApplyAfterTax { get; set; }
    public int? Priority { get; set; }
    public List<CreateDiscountTargetRuleDto>? TargetRules { get; set; }
    public List<CreateDiscountEligibilityRuleDto>? EligibilityRules { get; set; }
    public CreateBuyXGetYConfigDto? BuyXGetYConfig { get; set; }
    public CreateFreeShippingConfigDto? FreeShippingConfig { get; set; }
}
