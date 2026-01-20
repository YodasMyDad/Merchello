namespace Merchello.Core.Discounts.Models;

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
