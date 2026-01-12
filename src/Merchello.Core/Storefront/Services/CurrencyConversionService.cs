using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Storefront.Services.Interfaces;

namespace Merchello.Core.Storefront.Services;

/// <summary>
/// Service for converting amounts between currencies with proper rounding.
/// Centralizes currency conversion logic previously scattered in controllers.
/// </summary>
public class CurrencyConversionService(ICurrencyService currencyService) : ICurrencyConversionService
{
    /// <inheritdoc />
    public decimal Convert(decimal amount, decimal exchangeRate, string targetCurrencyCode)
    {
        if (exchangeRate == 1.0m)
        {
            return amount;
        }

        var converted = amount * exchangeRate;
        return currencyService.Round(converted, targetCurrencyCode);
    }

    /// <inheritdoc />
    public Dictionary<decimal, decimal> ConvertBatch(IEnumerable<decimal> amounts, decimal exchangeRate, string targetCurrencyCode)
    {
        var result = new Dictionary<decimal, decimal>();

        foreach (var amount in amounts)
        {
            if (!result.ContainsKey(amount))
            {
                result[amount] = Convert(amount, exchangeRate, targetCurrencyCode);
            }
        }

        return result;
    }

    /// <inheritdoc />
    public string Format(decimal amount, string currencySymbol)
    {
        return amount.FormatWithSymbol(currencySymbol);
    }
}
