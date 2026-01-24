namespace Merchello.Core.Checkout.Models;

/// <summary>
/// Display amounts in customer's selected currency.
/// Includes tax-inclusive variants when DisplayPricesIncTax setting is enabled.
/// </summary>
public record DisplayAmounts(
    decimal Total,
    decimal SubTotal,
    decimal Shipping,
    decimal Tax,
    decimal Discount,
    bool DisplayPricesIncTax = false,
    decimal TaxInclusiveSubTotal = 0,
    string? TaxIncludedMessage = null,
    decimal TaxInclusiveShipping = 0,
    decimal TaxInclusiveDiscount = 0);
