using Merchello.Core.Accounting.Models;
using Merchello.Core.Discounts.Models;

namespace Merchello.Core.Discounts.Dtos;

/// <summary>
/// DTO for creating a discount via API.
/// </summary>
public class CreateDiscountDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DiscountCategory Category { get; set; }
    public DiscountMethod Method { get; set; }
    public string? Code { get; set; }
    public DiscountValueType ValueType { get; set; }
    public decimal Value { get; set; }
    public DateTime? StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }
    public string? Timezone { get; set; }
    public int? TotalUsageLimit { get; set; }
    public int? PerCustomerUsageLimit { get; set; }
    public int? PerOrderUsageLimit { get; set; }
    public DiscountRequirementType RequirementType { get; set; }
    public decimal? RequirementValue { get; set; }
    public bool CanCombineWithProductDiscounts { get; set; }
    public bool CanCombineWithOrderDiscounts { get; set; }
    public bool CanCombineWithShippingDiscounts { get; set; }
    public int Priority { get; set; } = 1000;
    public List<CreateDiscountTargetRuleDto>? TargetRules { get; set; }
    public List<CreateDiscountEligibilityRuleDto>? EligibilityRules { get; set; }
    public CreateBuyXGetYConfigDto? BuyXGetYConfig { get; set; }
    public CreateFreeShippingConfigDto? FreeShippingConfig { get; set; }
}

/// <summary>
/// DTO for creating a target rule.
/// </summary>
public class CreateDiscountTargetRuleDto
{
    public DiscountTargetType TargetType { get; set; }
    public List<Guid>? TargetIds { get; set; }
    public bool IsExclusion { get; set; }
}

/// <summary>
/// DTO for creating an eligibility rule.
/// </summary>
public class CreateDiscountEligibilityRuleDto
{
    public DiscountEligibilityType EligibilityType { get; set; }
    public List<Guid>? EligibilityIds { get; set; }
}

/// <summary>
/// DTO for creating Buy X Get Y configuration.
/// </summary>
public class CreateBuyXGetYConfigDto
{
    public BuyXTriggerType BuyTriggerType { get; set; }
    public decimal BuyTriggerValue { get; set; }
    public DiscountTargetType BuyTargetType { get; set; }
    public List<Guid>? BuyTargetIds { get; set; }
    public int GetQuantity { get; set; }
    public DiscountTargetType GetTargetType { get; set; }
    public List<Guid>? GetTargetIds { get; set; }
    public DiscountValueType GetValueType { get; set; }
    public decimal GetValue { get; set; }
    public BuyXGetYSelectionMethod SelectionMethod { get; set; }
}

/// <summary>
/// DTO for creating Free Shipping configuration.
/// </summary>
public class CreateFreeShippingConfigDto
{
    public FreeShippingCountryScope CountryScope { get; set; }
    public List<string>? CountryCodes { get; set; }
    public bool ExcludeRatesOverAmount { get; set; }
    public decimal? ExcludeRatesOverValue { get; set; }
    public List<Guid>? AllowedShippingOptionIds { get; set; }
}
