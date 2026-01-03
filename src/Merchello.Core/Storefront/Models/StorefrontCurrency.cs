namespace Merchello.Core.Storefront.Models;

/// <summary>
/// Represents the current customer's currency preference for the storefront.
/// </summary>
/// <param name="CurrencyCode">ISO 4217 currency code (e.g., "USD", "GBP")</param>
/// <param name="CurrencySymbol">Currency symbol for display (e.g., "$", "£")</param>
/// <param name="DecimalPlaces">Number of decimal places for this currency</param>
public record StorefrontCurrency(
    string CurrencyCode,
    string CurrencySymbol,
    int DecimalPlaces);
