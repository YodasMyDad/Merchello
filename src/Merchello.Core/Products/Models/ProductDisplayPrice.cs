namespace Merchello.Core.Products.Models;

/// <summary>
/// Calculated display price for a product, ready for frontend rendering.
/// </summary>
/// <param name="Amount">Current selling price (inc or ex tax based on setting)</param>
/// <param name="CompareAtAmount">Previous price for strikethrough when OnSale (inc or ex tax)</param>
/// <param name="IncludesTax">Whether Amount includes tax</param>
/// <param name="TaxRate">Tax rate percentage (e.g., 20 for 20%)</param>
/// <param name="TaxAmount">Tax portion of the price</param>
/// <param name="CurrencyCode">Currency code for this price</param>
/// <param name="CurrencySymbol">Currency symbol for display</param>
/// <param name="DecimalPlaces">Number of decimal places for formatting</param>
public record ProductDisplayPrice(
    decimal Amount,
    decimal? CompareAtAmount,
    bool IncludesTax,
    decimal TaxRate,
    decimal TaxAmount,
    string CurrencyCode,
    string CurrencySymbol,
    int DecimalPlaces);
