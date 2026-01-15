using Merchello.Core.Shared.Models;

namespace Merchello.Core.Shared.Services.Interfaces;

public interface ICurrencyService
{
    CurrencyInfo GetCurrency(string currencyCode);
    string FormatAmount(decimal amount, string currencyCode);

    /// <summary>
    /// Formats an amount using a pre-resolved currency symbol.
    /// Use this when you already have the currency symbol (e.g., from a basket or invoice snapshot).
    /// </summary>
    /// <param name="amount">The amount to format.</param>
    /// <param name="currencySymbol">The currency symbol (e.g., "$", "£", "€").</param>
    /// <param name="decimalPlaces">Number of decimal places (defaults to 2).</param>
    /// <returns>Formatted price string (e.g., "$29.99").</returns>
    string FormatWithSymbol(decimal amount, string currencySymbol, int decimalPlaces = 2);

    decimal Round(decimal amount, string currencyCode);
    int GetDecimalPlaces(string currencyCode);
    long ToMinorUnits(decimal amount, string currencyCode);
    decimal FromMinorUnits(long minorUnits, string currencyCode);

    /// <summary>
    /// Converts an amount from store currency to presentment (customer) currency.
    /// Used for invoice creation and payment processing - NOT for display purposes.
    /// </summary>
    /// <remarks>
    /// CRITICAL: This divides by the exchange rate (store → presentment).
    /// For display purposes, use basket.GetDisplayAmounts() which multiplies.
    /// See Architecture-Diagrams.md "Checkout/Payment vs Display Values" section.
    /// </remarks>
    /// <param name="storeCurrencyAmount">Amount in store currency</param>
    /// <param name="exchangeRate">Rate from presentment → store (e.g., 1.36 for GBP→USD)</param>
    /// <param name="presentmentCurrency">Target currency code for rounding</param>
    /// <returns>Amount in presentment currency, properly rounded</returns>
    decimal ConvertToPresentmentCurrency(decimal storeCurrencyAmount, decimal exchangeRate, string presentmentCurrency);
}
