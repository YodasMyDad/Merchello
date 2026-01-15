using System.Collections.Concurrent;
using System.Globalization;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Microsoft.Extensions.Options;

namespace Merchello.Core.Shared.Services;

public class CurrencyService(IOptions<MerchelloSettings> settings) : ICurrencyService
{
    private static readonly ConcurrentDictionary<string, CultureInfo?> CurrencyCultureCache = new(StringComparer.OrdinalIgnoreCase);

    private static readonly HashSet<string> ZeroDecimalCurrencies = new(StringComparer.OrdinalIgnoreCase)
    {
        "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF"
    };

    private static readonly HashSet<string> ThreeDecimalCurrencies = new(StringComparer.OrdinalIgnoreCase)
    {
        "BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"
    };

    public CurrencyInfo GetCurrency(string currencyCode)
    {
        var code = NormalizeCurrencyCode(currencyCode);
        var decimals = GetDecimalPlaces(code);
        var culture = GetCulture(code);
        var symbol = culture?.NumberFormat.CurrencySymbol ?? GetCurrencySymbolFromRegion(code) ?? code;
        var symbolBefore = culture?.NumberFormat.CurrencyPositivePattern is 0 or 2;

        return new CurrencyInfo(
            Code: code,
            Symbol: symbol,
            DecimalPlaces: decimals,
            SymbolBefore: symbolBefore);
    }

    public string FormatAmount(decimal amount, string currencyCode)
    {
        var currency = GetCurrency(currencyCode);
        var rounded = Round(amount, currency.Code);

        var culture = GetCulture(currency.Code);
        if (culture == null)
        {
            var formattedNumber = rounded.ToString($"N{currency.DecimalPlaces}", CultureInfo.InvariantCulture);
            return currency.SymbolBefore
                ? $"{currency.Symbol}{formattedNumber}"
                : $"{formattedNumber}{currency.Symbol}";
        }

        var clone = (CultureInfo)culture.Clone();
        clone.NumberFormat.CurrencySymbol = currency.Symbol;
        clone.NumberFormat.CurrencyDecimalDigits = currency.DecimalPlaces;
        return rounded.ToString("C", clone);
    }

    /// <inheritdoc />
    public string FormatWithSymbol(decimal amount, string currencySymbol, int decimalPlaces = 2)
    {
        var rounded = Math.Round(amount, decimalPlaces, settings.Value.DefaultRounding);
        var formattedNumber = rounded.ToString($"N{decimalPlaces}", CultureInfo.InvariantCulture);
        return $"{currencySymbol}{formattedNumber}";
    }

    public decimal Round(decimal amount, string currencyCode)
    {
        var decimals = GetDecimalPlaces(currencyCode);
        return Math.Round(amount, decimals, settings.Value.DefaultRounding);
    }

    public int GetDecimalPlaces(string currencyCode)
    {
        var code = NormalizeCurrencyCode(currencyCode);
        if (ZeroDecimalCurrencies.Contains(code)) return 0;
        if (ThreeDecimalCurrencies.Contains(code)) return 3;
        return 2;
    }

    public long ToMinorUnits(decimal amount, string currencyCode)
    {
        var decimals = GetDecimalPlaces(currencyCode);
        var factor = Pow10(decimals);
        var rounded = Math.Round(amount, decimals, settings.Value.DefaultRounding);

        var scaled = rounded * factor;
        scaled = Math.Round(scaled, 0, settings.Value.DefaultRounding);
        return decimal.ToInt64(scaled);
    }

    public decimal FromMinorUnits(long minorUnits, string currencyCode)
    {
        var decimals = GetDecimalPlaces(currencyCode);
        var factor = Pow10(decimals);
        return minorUnits / factor;
    }

    /// <inheritdoc />
    public decimal ConvertToPresentmentCurrency(decimal storeCurrencyAmount, decimal exchangeRate, string presentmentCurrency)
    {
        // Rate is presentment → store, so divide to convert store → presentment
        // Example: $100 USD with rate 1.36 (GBP→USD) = £73.53 GBP
        return Round(storeCurrencyAmount / exchangeRate, presentmentCurrency);
    }

    private static string NormalizeCurrencyCode(string currencyCode)
        => string.IsNullOrWhiteSpace(currencyCode) ? "USD" : currencyCode.Trim().ToUpperInvariant();

    private static decimal Pow10(int decimals) => decimals switch
    {
        0 => 1m,
        1 => 10m,
        2 => 100m,
        3 => 1000m,
        4 => 10000m,
        5 => 100000m,
        6 => 1000000m,
        _ => throw new ArgumentOutOfRangeException(nameof(decimals), decimals, "Unsupported currency decimal places")
    };

    /// <summary>
    /// Gets the culture associated with a currency code, with caching.
    /// </summary>
    /// <remarks>
    /// Exceptions are intentionally swallowed here because:
    /// 1. RegionInfo constructor throws for some valid culture names (expected behavior)
    /// 2. This is a best-effort lookup - returning null is acceptable
    /// 3. Logging every failed lookup would be extremely noisy
    /// </remarks>
    private static CultureInfo? GetCulture(string currencyCode)
        => CurrencyCultureCache.GetOrAdd(currencyCode, static code =>
        {
            try
            {
                return CultureInfo.GetCultures(CultureTypes.SpecificCultures)
                    .FirstOrDefault(c =>
                    {
                        try
                        {
                            var region = new RegionInfo(c.Name);
                            return region.ISOCurrencySymbol.Equals(code, StringComparison.OrdinalIgnoreCase);
                        }
                        catch
                        {
                            // RegionInfo throws for some culture names - expected behavior
                            return false;
                        }
                    });
            }
            catch
            {
                // Fallback for any unexpected culture enumeration errors
                return null;
            }
        });

    /// <summary>
    /// Attempts to get the currency symbol from regional information.
    /// </summary>
    /// <remarks>
    /// Exceptions are intentionally swallowed here because:
    /// 1. RegionInfo constructor throws for some valid culture names (expected behavior)
    /// 2. This is a best-effort lookup - returning null falls back to using the currency code
    /// 3. Logging every failed lookup would be extremely noisy
    /// </remarks>
    private static string? GetCurrencySymbolFromRegion(string currencyCode)
    {
        try
        {
            var region = CultureInfo.GetCultures(CultureTypes.SpecificCultures)
                .Select(c =>
                {
                    try { return new RegionInfo(c.Name); }
                    catch { return null; } // RegionInfo throws for some culture names
                })
                .FirstOrDefault(r => r?.ISOCurrencySymbol.Equals(currencyCode, StringComparison.OrdinalIgnoreCase) == true);

            return region?.CurrencySymbol;
        }
        catch
        {
            // Fallback for any unexpected culture enumeration errors
            return null;
        }
    }
}

