namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// Response from applying a discount code.
/// </summary>
public class ApplyDiscountResponseDto
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public CheckoutBasketDto? Basket { get; set; }
}
