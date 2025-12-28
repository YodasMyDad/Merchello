namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// Basket DTO for checkout API responses.
/// </summary>
public class CheckoutBasketDto
{
    public Guid Id { get; set; }
    public List<CheckoutLineItemDto> LineItems { get; set; } = [];
    public decimal SubTotal { get; set; }
    public decimal Discount { get; set; }
    public decimal AdjustedSubTotal { get; set; }
    public decimal Tax { get; set; }
    public decimal Shipping { get; set; }
    public decimal Total { get; set; }
    public string FormattedSubTotal { get; set; } = "";
    public string FormattedDiscount { get; set; } = "";
    public string FormattedAdjustedSubTotal { get; set; } = "";
    public string FormattedTax { get; set; } = "";
    public string FormattedShipping { get; set; } = "";
    public string FormattedTotal { get; set; } = "";
    public string Currency { get; set; } = "";
    public string CurrencySymbol { get; set; } = "";
    public CheckoutAddressDto? BillingAddress { get; set; }
    public CheckoutAddressDto? ShippingAddress { get; set; }
    public List<AppliedDiscountDto> AppliedDiscounts { get; set; } = [];
    public bool IsEmpty { get; set; }
}
