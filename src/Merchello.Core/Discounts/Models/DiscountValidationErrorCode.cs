namespace Merchello.Core.Discounts.Models;

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
