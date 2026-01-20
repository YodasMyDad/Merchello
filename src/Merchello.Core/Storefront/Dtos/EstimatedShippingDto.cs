namespace Merchello.Core.Storefront.Dtos;

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
