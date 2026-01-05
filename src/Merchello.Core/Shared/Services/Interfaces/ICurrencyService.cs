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
}
