namespace Merchello.Core.Checkout.Dtos;

using Merchello.Core.Locality.Dtos;

/// <summary>
/// Basket DTO for checkout API responses (addresses, order groups, payment).
/// </summary>
/// <remarks>
/// <para><b>Usage:</b> Used by CheckoutApiController during the checkout flow.</para>
/// <para><b>vs StorefrontBasketDto:</b> This DTO is for the checkout flow (frozen state, single currency).
/// StorefrontBasketDto is for storefront shopping (live calculations, multi-currency display support).</para>
/// <para>Amounts are in basket/store currency. Display amounts are converted to customer's selected currency.</para>
/// </remarks>
public class CheckoutBasketDto
{
    public Guid Id { get; set; }
    public List<CheckoutLineItemDto> LineItems { get; set; } = [];

    // Store currency amounts (for calculations)
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

    // Display currency amounts (customer's selected currency)
    public decimal DisplaySubTotal { get; set; }
    public decimal DisplayDiscount { get; set; }
    public decimal DisplayTax { get; set; }
    public decimal DisplayShipping { get; set; }
    public decimal DisplayTotal { get; set; }
    public string FormattedDisplaySubTotal { get; set; } = "";
    public string FormattedDisplayDiscount { get; set; } = "";
    public string FormattedDisplayTax { get; set; } = "";
    public string FormattedDisplayShipping { get; set; } = "";
    public string FormattedDisplayTotal { get; set; } = "";
    public string DisplayCurrencyCode { get; set; } = "";
    public string DisplayCurrencySymbol { get; set; } = "";
    public decimal ExchangeRate { get; set; } = 1m;

    public AddressDto? BillingAddress { get; set; }
    public AddressDto? ShippingAddress { get; set; }
    public List<AppliedDiscountDto> AppliedDiscounts { get; set; } = [];
    public List<BasketErrorDto> Errors { get; set; } = [];
    public bool IsEmpty { get; set; }
}
