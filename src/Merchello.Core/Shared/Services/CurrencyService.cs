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

    /// <summary>
    /// Maps currency codes to their preferred "home" culture for consistent symbol display.
    /// Without this, CultureInfo.GetCultures() returns cultures in non-deterministic order,
    /// causing USD to sometimes show as "US$" instead of "$" depending on which culture matches first.
    /// </summary>
    private static readonly Dictionary<string, string> PreferredCultureByCurrency = new(StringComparer.OrdinalIgnoreCase)
    {
        // Major world currencies
        ["USD"] = "en-US",
        ["EUR"] = "de-DE",
        ["GBP"] = "en-GB",
        ["JPY"] = "ja-JP",
        ["CNY"] = "zh-CN",
        ["CHF"] = "de-CH",

        // Other major currencies
        ["CAD"] = "en-CA",
        ["AUD"] = "en-AU",
        ["NZD"] = "en-NZ",
        ["HKD"] = "zh-HK",
        ["SGD"] = "en-SG",
        ["SEK"] = "sv-SE",
        ["NOK"] = "nb-NO",
        ["DKK"] = "da-DK",
        ["MXN"] = "es-MX",
        ["BRL"] = "pt-BR",
        ["INR"] = "hi-IN",
        ["KRW"] = "ko-KR",
        ["RUB"] = "ru-RU",
        ["ZAR"] = "en-ZA",
        ["TRY"] = "tr-TR",
        ["PLN"] = "pl-PL",
        ["THB"] = "th-TH",
        ["IDR"] = "id-ID",
        ["MYR"] = "ms-MY",
        ["PHP"] = "en-PH",
        ["CZK"] = "cs-CZ",
        ["ILS"] = "he-IL",
        ["CLP"] = "es-CL",
        ["AED"] = "ar-AE",
        ["SAR"] = "ar-SA",
        ["TWD"] = "zh-TW",
        ["ARS"] = "es-AR",
        ["COP"] = "es-CO",
        ["PEN"] = "es-PE",
        ["VND"] = "vi-VN",
        ["EGP"] = "ar-EG",
        ["PKR"] = "ur-PK",
        ["BGN"] = "bg-BG",
        ["RON"] = "ro-RO",
        ["HUF"] = "hu-HU",
        ["UAH"] = "uk-UA",
        ["NGN"] = "en-NG",
        ["KES"] = "sw-KE",
        ["QAR"] = "ar-QA",
        ["KWD"] = "ar-KW",
        ["BHD"] = "ar-BH",
        ["OMR"] = "ar-OM",
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
        => CurrencyCultureCache.GetOrAdd(currencyCode, code =>
        {
            // Try preferred culture first for consistent symbol display
            if (PreferredCultureByCurrency.TryGetValue(code, out var preferredCultureName))
            {
                try
                {
                    var preferredCulture = CultureInfo.GetCultureInfo(preferredCultureName);
                    var region = new RegionInfo(preferredCulture.Name);
                    if (region.ISOCurrencySymbol.Equals(code, StringComparison.OrdinalIgnoreCase))
                    {
                        return preferredCulture;
                    }
                }
                catch
                {
                    // Fall through to enumeration approach
                }
            }

            // Fallback: enumerate all cultures
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

