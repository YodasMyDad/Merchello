using Merchello.Core.Accounting.Models;
using Merchello.Core.Discounts.Models;

namespace Merchello.Core.Discounts.Services.Parameters;

/// <summary>
/// Parameters for creating a new discount.
/// </summary>
public class CreateDiscountParameters
{
    // =====================================================
    // Basic Info
    // =====================================================

    /// <summary>
    /// Display name of the discount (required).
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Optional description of the discount.
    /// </summary>
    public string? Description { get; set; }

    // =====================================================
    // Type & Method
    // =====================================================

    /// <summary>
    /// The category of discount (required).
    /// </summary>
    public DiscountCategory Category { get; set; }

    /// <summary>
    /// How the discount is applied - Code or Automatic (required).
    /// </summary>
    public DiscountMethod Method { get; set; }

    /// <summary>
    /// The discount code for code-based discounts.
    /// Required when Method is Code.
    /// </summary>
    public string? Code { get; set; }

    // =====================================================
    // Value
    // =====================================================

    /// <summary>
    /// The type of value - FixedAmount, Percentage, or Free (required).
    /// </summary>
    public DiscountValueType ValueType { get; set; }

    /// <summary>
    /// The discount value (e.g., 10 for 10% or £10).
    /// </summary>
    public decimal Value { get; set; }

    // =====================================================
    // Scheduling
    // =====================================================

    /// <summary>
    /// When the discount becomes active (UTC). Defaults to now.
    /// </summary>
    public DateTime? StartsAt { get; set; }

    /// <summary>
    /// When the discount expires (UTC). Null for no expiry.
    /// </summary>
    public DateTime? EndsAt { get; set; }

    /// <summary>
    /// Timezone for display purposes.
    /// </summary>
    public string? Timezone { get; set; }

    // =====================================================
    // Limits
    // =====================================================

    /// <summary>
    /// Maximum total times this discount can be used. Null for unlimited.
    /// </summary>
    public int? TotalUsageLimit { get; set; }

    /// <summary>
    /// Maximum times a single customer can use this discount. Null for unlimited.
    /// </summary>
    public int? PerCustomerUsageLimit { get; set; }

    /// <summary>
    /// Maximum times this discount can be applied per order (for BOGO). Null for unlimited.
    /// </summary>
    public int? PerOrderUsageLimit { get; set; }

    // =====================================================
    // Minimum Requirements
    // =====================================================

    /// <summary>
    /// The type of minimum requirement.
    /// </summary>
    public DiscountRequirementType RequirementType { get; set; } = DiscountRequirementType.None;

    /// <summary>
    /// The minimum value required (amount or quantity based on RequirementType).
    /// </summary>
    public decimal? RequirementValue { get; set; }

    // =====================================================
    // Combinations
    // =====================================================

    /// <summary>
    /// Whether this discount can be combined with product discounts.
    /// </summary>
    public bool CanCombineWithProductDiscounts { get; set; }

    /// <summary>
    /// Whether this discount can be combined with order discounts.
    /// </summary>
    public bool CanCombineWithOrderDiscounts { get; set; }

    /// <summary>
    /// Whether this discount can be combined with shipping discounts.
    /// </summary>
    public bool CanCombineWithShippingDiscounts { get; set; }

    /// <summary>
    /// When true, the discount value is calculated based on the after-tax total,
    /// then reverse-calculated to determine the pre-tax discount amount.
    /// Default: false (discount applied to pre-tax subtotal).
    /// </summary>
    public bool ApplyAfterTax { get; set; }

    // =====================================================
    // Priority
    // =====================================================

    /// <summary>
    /// Priority for applying discounts. Lower values = higher priority.
    /// </summary>
    public int Priority { get; set; } = 1000;

    // =====================================================
    // Audit
    // =====================================================

    /// <summary>
    /// The user creating this discount.
    /// </summary>
    public Guid? CreatedBy { get; set; }

    // =====================================================
    // Target Rules
    // =====================================================

    /// <summary>
    /// Target rules defining what products/categories this discount applies to.
    /// </summary>
    public List<CreateDiscountTargetRuleParameters>? TargetRules { get; set; }

    // =====================================================
    // Eligibility Rules
    // =====================================================

    /// <summary>
    /// Eligibility rules defining who can use this discount.
    /// </summary>
    public List<CreateDiscountEligibilityRuleParameters>? EligibilityRules { get; set; }

    // =====================================================
    // Type-Specific Config
    // =====================================================

    /// <summary>
    /// Buy X Get Y configuration (only for BuyXGetY category).
    /// </summary>
    public CreateBuyXGetYParameters? BuyXGetYConfig { get; set; }

    /// <summary>
    /// Free shipping configuration (only for FreeShipping category).
    /// </summary>
    public CreateFreeShippingParameters? FreeShippingConfig { get; set; }
}

/// <summary>
/// Parameters for creating a discount target rule.
/// </summary>
public class CreateDiscountTargetRuleParameters
{
    /// <summary>
    /// The type of target.
    /// </summary>
    public DiscountTargetType TargetType { get; set; }

    /// <summary>
    /// The target IDs (product IDs, category IDs, etc.).
    /// </summary>
    public List<Guid>? TargetIds { get; set; }

    /// <summary>
    /// Whether this rule excludes the targets rather than includes them.
    /// </summary>
    public bool IsExclusion { get; set; }
}

/// <summary>
/// Parameters for creating a discount eligibility rule.
/// </summary>
public class CreateDiscountEligibilityRuleParameters
{
    /// <summary>
    /// The type of eligibility.
    /// </summary>
    public DiscountEligibilityType EligibilityType { get; set; }

    /// <summary>
    /// The eligibility IDs (segment IDs or customer IDs).
    /// </summary>
    public List<Guid>? EligibilityIds { get; set; }
}
