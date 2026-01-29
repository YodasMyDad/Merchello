namespace Merchello.Core.Upsells.Dtos;

/// <summary>
/// Preview of adding a post-purchase upsell item (price, tax, shipping without committing).
/// </summary>
public class PostPurchasePreviewDto
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; }

    // Amounts in presentment (customer) currency
    public decimal UnitPrice { get; set; }
    public decimal SubTotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal ShippingDelta { get; set; }
    public decimal Total { get; set; }

    // Store currency equivalents (for reporting/reconciliation)
    public decimal UnitPriceInStoreCurrency { get; set; }
    public decimal SubTotalInStoreCurrency { get; set; }
    public decimal TotalInStoreCurrency { get; set; }

    // Formatted for display
    public string FormattedUnitPrice { get; set; } = string.Empty;
    public string FormattedSubTotal { get; set; } = string.Empty;
    public string FormattedTaxAmount { get; set; } = string.Empty;
    public string FormattedShippingDelta { get; set; } = string.Empty;
    public string FormattedTotal { get; set; } = string.Empty;
    public string CurrencyCode { get; set; } = string.Empty;
    public string CurrencySymbol { get; set; } = string.Empty;

    // Tax-inclusive display (follows MerchelloSettings.DisplayPricesIncTax)
    public bool PriceIncludesTax { get; set; }
    public string? TaxLabel { get; set; }
    public decimal TaxRate { get; set; }

    // Validation
    public bool IsAvailable { get; set; }
    public string? UnavailableReason { get; set; }
}
