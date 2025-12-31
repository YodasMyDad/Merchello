namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// Request to apply a discount code to the basket.
/// </summary>
public class ApplyDiscountRequestDto
{
    /// <summary>
    /// The discount code to apply.
    /// </summary>
    public required string Code { get; set; }
}
