namespace Merchello.Core.Storefront.Services.Interfaces;

/// <summary>
/// Service for converting amounts between currencies with proper rounding.
/// Used by storefront controllers to display prices in customer's preferred currency.
/// </summary>
public interface ICurrencyConversionService
{
    /// <summary>
    /// Converts an amount using a pre-fetched exchange rate.
    /// Use this for efficient batch conversions after fetching the rate once.
    /// </summary>
    /// <param name="amount">The amount in store currency</param>
    /// <param name="exchangeRate">The exchange rate from store to target currency</param>
    /// <param name="targetCurrencyCode">The target currency code for rounding</param>
    /// <returns>The converted and rounded amount</returns>
    decimal Convert(decimal amount, decimal exchangeRate, string targetCurrencyCode);

    /// <summary>
    /// Converts multiple amounts using a pre-fetched exchange rate.
    /// More efficient than calling Convert multiple times.
    /// </summary>
    /// <param name="amounts">The amounts in store currency</param>
    /// <param name="exchangeRate">The exchange rate from store to target currency</param>
    /// <param name="targetCurrencyCode">The target currency code for rounding</param>
    /// <returns>Dictionary mapping original amounts to converted amounts</returns>
    Dictionary<decimal, decimal> ConvertBatch(IEnumerable<decimal> amounts, decimal exchangeRate, string targetCurrencyCode);

    /// <summary>
    /// Formats an amount with the currency symbol.
    /// </summary>
    /// <param name="amount">The amount to format</param>
    /// <param name="currencySymbol">The currency symbol to use</param>
    /// <returns>Formatted string with currency symbol</returns>
    string Format(decimal amount, string currencySymbol);
}
