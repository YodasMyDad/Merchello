using Merchello.Core.Discounts.Models;

namespace Merchello.Core.Discounts.Services;

/// <summary>
/// Result of validating a discount code.
/// </summary>
public class DiscountValidationResult
{
    /// <summary>
    /// Whether the discount code is valid.
    /// </summary>
    public bool IsValid { get; set; }

    /// <summary>
    /// The discount if valid.
    /// </summary>
    public Discount? Discount { get; set; }

    /// <summary>
    /// Error message if not valid.
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Error code for programmatic handling.
    /// </summary>
    public DiscountValidationErrorCode? ErrorCode { get; set; }

    public static DiscountValidationResult Valid(Discount discount) => new()
    {
        IsValid = true,
        Discount = discount
    };

    public static DiscountValidationResult Invalid(DiscountValidationErrorCode errorCode, string message) => new()
    {
        IsValid = false,
        ErrorCode = errorCode,
        ErrorMessage = message
    };
}

/// <summary>
/// Error codes for discount validation failures.
/// </summary>
public enum DiscountValidationErrorCode
{
    NotFound,
    Inactive,
    NotStarted,
    Expired,
    UsageLimitReached,
    CustomerUsageLimitReached,
    CustomerNotEligible,
    MinimumRequirementNotMet,
    NoApplicableProducts,
    AlreadyApplied,
    CannotCombine
}

/// <summary>
/// Result of calculating a discount.
/// </summary>
public class DiscountCalculationResult
{
    /// <summary>
    /// Whether the calculation was successful.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// The discount that was calculated.
    /// </summary>
    public Discount? Discount { get; set; }

    /// <summary>
    /// The total discount amount.
    /// </summary>
    public decimal TotalDiscountAmount { get; set; }

    /// <summary>
    /// Discount amount applied to products.
    /// </summary>
    public decimal ProductDiscountAmount { get; set; }

    /// <summary>
    /// Discount amount applied to order total.
    /// </summary>
    public decimal OrderDiscountAmount { get; set; }

    /// <summary>
    /// Discount amount applied to shipping.
    /// </summary>
    public decimal ShippingDiscountAmount { get; set; }

    /// <summary>
    /// The line items with discounts applied.
    /// </summary>
    public List<DiscountedLineItem> DiscountedLineItems { get; set; } = [];

    /// <summary>
    /// Error message if calculation failed.
    /// </summary>
    public string? ErrorMessage { get; set; }

    public static DiscountCalculationResult Failed(string message) => new()
    {
        Success = false,
        ErrorMessage = message
    };
}

/// <summary>
/// A line item with discount information.
/// </summary>
public class DiscountedLineItem
{
    /// <summary>
    /// The original line item ID.
    /// </summary>
    public Guid LineItemId { get; set; }

    /// <summary>
    /// The product ID.
    /// </summary>
    public Guid ProductId { get; set; }

    /// <summary>
    /// The quantity being discounted.
    /// </summary>
    public int DiscountedQuantity { get; set; }

    /// <summary>
    /// The discount amount per unit.
    /// </summary>
    public decimal DiscountPerUnit { get; set; }

    /// <summary>
    /// The total discount for this line.
    /// </summary>
    public decimal TotalDiscount { get; set; }

    /// <summary>
    /// The original unit price.
    /// </summary>
    public decimal OriginalUnitPrice { get; set; }

    /// <summary>
    /// The discounted unit price.
    /// </summary>
    public decimal DiscountedUnitPrice { get; set; }
}

/// <summary>
/// An applicable automatic discount with its calculated value.
/// </summary>
public class ApplicableDiscount
{
    /// <summary>
    /// The discount.
    /// </summary>
    public Discount Discount { get; set; } = null!;

    /// <summary>
    /// The calculated discount amount.
    /// </summary>
    public decimal CalculatedAmount { get; set; }

    /// <summary>
    /// Whether this discount can be combined with others.
    /// </summary>
    public bool CanCombine { get; set; }
}

/// <summary>
/// Result of applying multiple discounts.
/// </summary>
public class ApplyDiscountsResult
{
    /// <summary>
    /// Whether the application was successful.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// The discounts that were applied.
    /// </summary>
    public List<AppliedDiscountInfo> AppliedDiscounts { get; set; } = [];

    /// <summary>
    /// The total discount amount across all discounts.
    /// </summary>
    public decimal TotalDiscountAmount { get; set; }

    /// <summary>
    /// The final discounted line items.
    /// </summary>
    public List<DiscountedLineItem> DiscountedLineItems { get; set; } = [];

    /// <summary>
    /// Error message if application failed.
    /// </summary>
    public string? ErrorMessage { get; set; }
}

/// <summary>
/// Information about an applied discount.
/// </summary>
public class AppliedDiscountInfo
{
    /// <summary>
    /// The discount ID.
    /// </summary>
    public Guid DiscountId { get; set; }

    /// <summary>
    /// The discount name.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// The discount code if applicable.
    /// </summary>
    public string? Code { get; set; }

    /// <summary>
    /// The category of discount.
    /// </summary>
    public DiscountCategory Category { get; set; }

    /// <summary>
    /// The amount discounted.
    /// </summary>
    public decimal DiscountAmount { get; set; }
}
