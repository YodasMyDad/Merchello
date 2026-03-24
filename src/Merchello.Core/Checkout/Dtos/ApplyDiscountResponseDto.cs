namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// Response from applying or removing a discount code.
/// </summary>
public class ApplyDiscountResponseDto
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public CheckoutBasketDto? Basket { get; set; }

    /// <summary>
    /// Absolute change in the display-currency discount total (always >= 0).
    /// Used by frontend analytics to report the discount amount changed without client-side math.
    /// </summary>
    public decimal DiscountDelta { get; set; }
}
