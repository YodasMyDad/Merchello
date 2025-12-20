using Merchello.Core.Accounting.Models;
using Merchello.Core.Discounts.Models;

namespace Merchello.Core.Discounts.Dtos;

/// <summary>
/// DTO for discount details with all related data.
/// </summary>
public class DiscountDetailDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DiscountStatus Status { get; set; }
    public DiscountCategory Category { get; set; }
    public DiscountMethod Method { get; set; }
    public string? Code { get; set; }
    public DiscountValueType ValueType { get; set; }
    public decimal Value { get; set; }
    public DateTime StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }
    public string? Timezone { get; set; }
    public int? TotalUsageLimit { get; set; }
    public int? PerCustomerUsageLimit { get; set; }
    public int? PerOrderUsageLimit { get; set; }
    public int CurrentUsageCount { get; set; }
    public DiscountRequirementType RequirementType { get; set; }
    public decimal? RequirementValue { get; set; }
    public bool CanCombineWithProductDiscounts { get; set; }
    public bool CanCombineWithOrderDiscounts { get; set; }
    public bool CanCombineWithShippingDiscounts { get; set; }
    public bool ApplyAfterTax { get; set; }
    public int Priority { get; set; }
    public DateTime DateCreated { get; set; }
    public DateTime DateUpdated { get; set; }
    public Guid? CreatedBy { get; set; }
    public List<DiscountTargetRuleDto> TargetRules { get; set; } = [];
    public List<DiscountEligibilityRuleDto> EligibilityRules { get; set; } = [];
    public DiscountBuyXGetYConfigDto? BuyXGetYConfig { get; set; }
    public DiscountFreeShippingConfigDto? FreeShippingConfig { get; set; }
}

/// <summary>
/// DTO for discount target rules.
/// </summary>
public class DiscountTargetRuleDto
{
    public Guid Id { get; set; }
    public DiscountTargetType TargetType { get; set; }
    public List<Guid>? TargetIds { get; set; }
    public List<string>? TargetNames { get; set; }
    public bool IsExclusion { get; set; }
}

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

/// <summary>
/// DTO for Buy X Get Y configuration.
/// </summary>
public class DiscountBuyXGetYConfigDto
{
    public BuyXTriggerType BuyTriggerType { get; set; }
    public decimal BuyTriggerValue { get; set; }
    public DiscountTargetType BuyTargetType { get; set; }
    public List<Guid>? BuyTargetIds { get; set; }
    public List<string>? BuyTargetNames { get; set; }
    public int GetQuantity { get; set; }
    public DiscountTargetType GetTargetType { get; set; }
    public List<Guid>? GetTargetIds { get; set; }
    public List<string>? GetTargetNames { get; set; }
    public DiscountValueType GetValueType { get; set; }
    public decimal GetValue { get; set; }
    public BuyXGetYSelectionMethod SelectionMethod { get; set; }
}

/// <summary>
/// DTO for Free Shipping configuration.
/// </summary>
public class DiscountFreeShippingConfigDto
{
    public FreeShippingCountryScope CountryScope { get; set; }
    public List<string>? CountryCodes { get; set; }
    public bool ExcludeRatesOverAmount { get; set; }
    public decimal? ExcludeRatesOverValue { get; set; }
    public List<Guid>? AllowedShippingOptionIds { get; set; }
}
