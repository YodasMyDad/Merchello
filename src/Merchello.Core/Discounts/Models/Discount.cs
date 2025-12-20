using Merchello.Core.Accounting.Models;
using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Discounts.Models;

/// <summary>
/// Represents a discount that can be applied to products, orders, or shipping.
/// </summary>
public class Discount
{
    /// <summary>
    /// Unique identifier for the discount.
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    // =====================================================
    // Basic Info
    // =====================================================

    /// <summary>
    /// Display name of the discount.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Optional description of the discount.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Current status of the discount.
    /// </summary>
    public DiscountStatus Status { get; set; } = DiscountStatus.Draft;

    // =====================================================
    // Type & Method
    // =====================================================

    /// <summary>
    /// The category of discount (AmountOffProducts, BuyXGetY, etc.).
    /// </summary>
    public DiscountCategory Category { get; set; }

    /// <summary>
    /// How the discount is applied (Code or Automatic).
    /// </summary>
    public DiscountMethod Method { get; set; }

    /// <summary>
    /// The discount code for code-based discounts. Null for automatic discounts.
    /// </summary>
    public string? Code { get; set; }

    // =====================================================
    // Value
    // =====================================================

    /// <summary>
    /// The type of value (FixedAmount, Percentage, or Free).
    /// </summary>
    public DiscountValueType ValueType { get; set; }

    /// <summary>
    /// The discount value (e.g., 10 for 10% or £10).
    /// </summary>
    public decimal Value { get; set; }

    /// <summary>
    /// When true, the discount is calculated based on the after-tax total,
    /// then reverse-calculated to determine the pre-tax discount amount.
    /// The customer sees the expected saving (e.g., 10% off £120 = £12 saved).
    /// Default: false (discount applied to pre-tax subtotal).
    /// </summary>
    public bool ApplyAfterTax { get; set; }

    // =====================================================
    // Scheduling
    // =====================================================

    /// <summary>
    /// When the discount becomes active (UTC).
    /// </summary>
    public DateTime StartsAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When the discount expires (UTC). Null for no expiry.
    /// </summary>
    public DateTime? EndsAt { get; set; }

    /// <summary>
    /// Timezone for display purposes (e.g., "Europe/London").
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
    /// The type of minimum requirement (None, MinimumPurchaseAmount, or MinimumQuantity).
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
    /// Date the discount was created (UTC).
    /// </summary>
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Date the discount was last updated (UTC).
    /// </summary>
    public DateTime DateUpdated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// The user who created this discount (optional).
    /// </summary>
    public Guid? CreatedBy { get; set; }

    // =====================================================
    // Navigation Properties
    // =====================================================

    /// <summary>
    /// Target rules defining what products/categories this discount applies to.
    /// </summary>
    public virtual ICollection<DiscountTargetRule> TargetRules { get; set; } = [];

    /// <summary>
    /// Eligibility rules defining who can use this discount.
    /// </summary>
    public virtual ICollection<DiscountEligibilityRule> EligibilityRules { get; set; } = [];

    /// <summary>
    /// Buy X Get Y configuration (only for BuyXGetY discounts).
    /// </summary>
    public virtual DiscountBuyXGetYConfig? BuyXGetYConfig { get; set; }

    /// <summary>
    /// Free shipping configuration (only for FreeShipping discounts).
    /// </summary>
    public virtual DiscountFreeShippingConfig? FreeShippingConfig { get; set; }
}
