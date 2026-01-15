using Merchello.Core.Checkout.Dtos;

namespace Merchello.Core.Storefront.Dtos;

/// <summary>
/// Result of a basket operation (add, update, remove)
/// </summary>
public class BasketOperationResultDto
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public int ItemCount { get; set; }
    public decimal Total { get; set; }
    public string? FormattedTotal { get; set; }
}

/// <summary>
/// Simple basket count response
/// </summary>
public class BasketCountDto
{
    public int ItemCount { get; set; }
    public decimal Total { get; set; }
    public string? FormattedTotal { get; set; }
}

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

/// <summary>
/// Line item in basket with multi-currency support
/// </summary>
public class StorefrontLineItemDto
{
    public Guid Id { get; set; }
    public string Sku { get; set; } = "";

    /// <summary>
    /// The variant name (e.g., "S-Grey"). Kept for backward compatibility.
    /// For display, prefer ProductRootName with SelectedOptions.
    /// </summary>
    public string Name { get; set; } = "";

    /// <summary>
    /// The root product name (e.g., "Premium V-Neck").
    /// </summary>
    public string ProductRootName { get; set; } = "";

    /// <summary>
    /// Selected options for this variant (e.g., Color: Grey, Size: S).
    /// </summary>
    public List<SelectedOptionDto> SelectedOptions { get; set; } = [];

    public int Quantity { get; set; }

    // Store currency amounts
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
    public string FormattedUnitPrice { get; set; } = "";
    public string FormattedLineTotal { get; set; } = "";

    // Display amounts (in customer's selected currency)
    public decimal DisplayUnitPrice { get; set; }
    public decimal DisplayLineTotal { get; set; }
    public string FormattedDisplayUnitPrice { get; set; } = "";
    public string FormattedDisplayLineTotal { get; set; } = "";

    // Tax info (for tax-inclusive display calculations)
    public decimal TaxRate { get; set; }
    public bool IsTaxable { get; set; }

    public string LineItemType { get; set; } = "";
    public string? DependantLineItemSku { get; set; }
}

/// <summary>
/// Availability status for a basket item
/// </summary>
public class BasketItemAvailabilityDto
{
    public bool CanShipToCountry { get; set; }
    public bool HasStock { get; set; }
    public string? Message { get; set; }
}

/// <summary>
/// Estimated shipping calculation result
/// </summary>
public class EstimatedShippingDto
{
    public bool Success { get; set; }
    public decimal EstimatedShipping { get; set; }
    public string FormattedEstimatedShipping { get; set; } = "";
    public decimal DisplayEstimatedShipping { get; set; }
    public string FormattedDisplayEstimatedShipping { get; set; } = "";

    /// <summary>
    /// Updated basket total (including shipping) in display currency.
    /// Use this instead of adding DisplayEstimatedShipping to a previous total.
    /// </summary>
    public decimal DisplayTotal { get; set; }
    public string FormattedDisplayTotal { get; set; } = "";

    /// <summary>
    /// Updated tax amount (with shipping tax included) in display currency.
    /// </summary>
    public decimal DisplayTax { get; set; }
    public string FormattedDisplayTax { get; set; } = "";

    // Tax-inclusive display (when DisplayPricesIncTax setting is enabled)
    public bool DisplayPricesIncTax { get; set; }
    public decimal TaxInclusiveDisplaySubTotal { get; set; }
    public string FormattedTaxInclusiveDisplaySubTotal { get; set; } = "";
    public decimal TaxInclusiveDisplayShipping { get; set; }
    public string FormattedTaxInclusiveDisplayShipping { get; set; } = "";
    public decimal TaxInclusiveDisplayDiscount { get; set; }
    public string FormattedTaxInclusiveDisplayDiscount { get; set; } = "";
    public string? TaxIncludedMessage { get; set; }

    public int GroupCount { get; set; }
    public string? Message { get; set; }
}
