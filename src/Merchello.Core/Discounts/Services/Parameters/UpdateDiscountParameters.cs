using Merchello.Core.Accounting.Models;
using Merchello.Core.Discounts.Models;

namespace Merchello.Core.Discounts.Services.Parameters;

/// <summary>
/// Parameters for updating an existing discount.
/// </summary>
public class UpdateDiscountParameters
{
    // =====================================================
    // Basic Info
    // =====================================================

    /// <summary>
    /// Updated name (null to keep existing).
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// Updated description (null to keep existing).
    /// </summary>
    public string? Description { get; set; }

    // =====================================================
    // Code (only for code-based discounts)
    // =====================================================

    /// <summary>
    /// Updated discount code (null to keep existing).
    /// </summary>
    public string? Code { get; set; }

    // =====================================================
    // Value
    // =====================================================

    /// <summary>
    /// Updated value type (null to keep existing).
    /// </summary>
    public DiscountValueType? ValueType { get; set; }

    /// <summary>
    /// Updated value (null to keep existing).
    /// </summary>
    public decimal? Value { get; set; }

    // =====================================================
    // Scheduling
    // =====================================================

    /// <summary>
    /// Updated start date (null to keep existing).
    /// </summary>
    public DateTime? StartsAt { get; set; }

    /// <summary>
    /// Updated end date (null to keep existing, explicitly set to remove).
    /// </summary>
    public DateTime? EndsAt { get; set; }

    /// <summary>
    /// Whether to clear the end date.
    /// </summary>
    public bool ClearEndsAt { get; set; }

    /// <summary>
    /// Updated timezone (null to keep existing).
    /// </summary>
    public string? Timezone { get; set; }

    // =====================================================
    // Limits
    // =====================================================

    /// <summary>
    /// Updated total usage limit (null to keep existing).
    /// </summary>
    public int? TotalUsageLimit { get; set; }

    /// <summary>
    /// Whether to clear the total usage limit.
    /// </summary>
    public bool ClearTotalUsageLimit { get; set; }

    /// <summary>
    /// Updated per-customer usage limit (null to keep existing).
    /// </summary>
    public int? PerCustomerUsageLimit { get; set; }

    /// <summary>
    /// Whether to clear the per-customer usage limit.
    /// </summary>
    public bool ClearPerCustomerUsageLimit { get; set; }

    /// <summary>
    /// Updated per-order usage limit (null to keep existing).
    /// </summary>
    public int? PerOrderUsageLimit { get; set; }

    /// <summary>
    /// Whether to clear the per-order usage limit.
    /// </summary>
    public bool ClearPerOrderUsageLimit { get; set; }

    // =====================================================
    // Minimum Requirements
    // =====================================================

    /// <summary>
    /// Updated requirement type (null to keep existing).
    /// </summary>
    public DiscountRequirementType? RequirementType { get; set; }

    /// <summary>
    /// Updated requirement value (null to keep existing).
    /// </summary>
    public decimal? RequirementValue { get; set; }

    // =====================================================
    // Combinations
    // =====================================================

    /// <summary>
    /// Updated product discount combination flag (null to keep existing).
    /// </summary>
    public bool? CanCombineWithProductDiscounts { get; set; }

    /// <summary>
    /// Updated order discount combination flag (null to keep existing).
    /// </summary>
    public bool? CanCombineWithOrderDiscounts { get; set; }

    /// <summary>
    /// Updated shipping discount combination flag (null to keep existing).
    /// </summary>
    public bool? CanCombineWithShippingDiscounts { get; set; }

    /// <summary>
    /// Updated apply after tax flag (null to keep existing).
    /// When true, the discount is calculated based on the after-tax total.
    /// </summary>
    public bool? ApplyAfterTax { get; set; }

    // =====================================================
    // Priority
    // =====================================================

    /// <summary>
    /// Updated priority (null to keep existing).
    /// </summary>
    public int? Priority { get; set; }

    // =====================================================
    // Target Rules
    // =====================================================

    /// <summary>
    /// Updated target rules (null to keep existing, empty list to clear).
    /// </summary>
    public List<CreateDiscountTargetRuleParameters>? TargetRules { get; set; }

    // =====================================================
    // Eligibility Rules
    // =====================================================

    /// <summary>
    /// Updated eligibility rules (null to keep existing, empty list to clear).
    /// </summary>
    public List<CreateDiscountEligibilityRuleParameters>? EligibilityRules { get; set; }

    // =====================================================
    // Type-Specific Config
    // =====================================================

    /// <summary>
    /// Updated Buy X Get Y configuration (null to keep existing).
    /// </summary>
    public CreateBuyXGetYParameters? BuyXGetYConfig { get; set; }

    /// <summary>
    /// Updated Free shipping configuration (null to keep existing).
    /// </summary>
    public CreateFreeShippingParameters? FreeShippingConfig { get; set; }
}
