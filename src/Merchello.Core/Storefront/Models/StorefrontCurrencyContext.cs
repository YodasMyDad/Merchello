namespace Merchello.Core.Storefront.Models;

/// <summary>
/// Full currency context for storefront display, including exchange rate.
/// </summary>
/// <param name="CurrencyCode">Customer's selected currency code (e.g., "USD")</param>
/// <param name="CurrencySymbol">Currency symbol for display (e.g., "$")</param>
/// <param name="DecimalPlaces">Number of decimal places for this currency</param>
/// <param name="ExchangeRate">Exchange rate from store currency to customer currency</param>
/// <param name="StoreCurrencyCode">Store's base currency code (e.g., "GBP")</param>
public record StorefrontCurrencyContext(
    string CurrencyCode,
    string CurrencySymbol,
    int DecimalPlaces,
    decimal ExchangeRate,
    string StoreCurrencyCode);
