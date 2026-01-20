namespace Merchello.Core.Storefront.Dtos;

/// <summary>
/// Full basket response with line items and multi-currency support.
/// </summary>
/// <remarks>
/// <para><b>Usage:</b> Used by StorefrontApiController for storefront shopping pages.</para>
/// <para><b>vs CheckoutBasketDto:</b> This DTO supports multi-currency display (Store + Display amounts).
/// CheckoutBasketDto is for checkout flow (single currency, frozen state).</para>
/// <para><b>Store amounts:</b> Internal amounts in store currency (for calculations).</para>
/// <para><b>Display amounts:</b> Converted to customer's selected currency (for display).</para>
/// </remarks>
public class StorefrontBasketDto
{
    public List<StorefrontLineItemDto> Items { get; set; } = [];

    // Store currency amounts (internal)
    public decimal SubTotal { get; set; }
    public decimal Discount { get; set; }
    public decimal Tax { get; set; }
    public decimal Shipping { get; set; }
    public decimal Total { get; set; }
    public string FormattedSubTotal { get; set; } = "";
    public string FormattedDiscount { get; set; } = "";
    public string FormattedTax { get; set; } = "";
    public string FormattedTotal { get; set; } = "";
    public string CurrencySymbol { get; set; } = "";

    // Display amounts (in customer's selected currency)
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

    // Customer's selected currency info
    public string DisplayCurrencyCode { get; set; } = "";
    public string DisplayCurrencySymbol { get; set; } = "";
    public decimal ExchangeRate { get; set; } = 1.0m;

    // Tax-inclusive display (when DisplayPricesIncTax setting is enabled)
    public bool DisplayPricesIncTax { get; set; }
    public decimal TaxInclusiveDisplaySubTotal { get; set; }
    public string FormattedTaxInclusiveDisplaySubTotal { get; set; } = "";
    public decimal TaxInclusiveDisplayShipping { get; set; }
    public string FormattedTaxInclusiveDisplayShipping { get; set; } = "";
    public decimal TaxInclusiveDisplayDiscount { get; set; }
    public string FormattedTaxInclusiveDisplayDiscount { get; set; } = "";
    public string? TaxIncludedMessage { get; set; }

    public int ItemCount { get; set; }
    public bool IsEmpty { get; set; }

    // Availability (SSR) - keyed by line item ID string for JS compatibility
    public bool AllItemsAvailable { get; set; } = true;
    public Dictionary<string, BasketItemAvailabilityDto> ItemAvailability { get; set; } = [];
}
