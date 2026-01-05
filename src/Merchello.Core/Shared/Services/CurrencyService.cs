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
                            return false;
                        }
                    });
            }
            catch
            {
                return null;
            }
        });

    private static string? GetCurrencySymbolFromRegion(string currencyCode)
    {
        try
        {
            var region = CultureInfo.GetCultures(CultureTypes.SpecificCultures)
                .Select(c =>
                {
                    try { return new RegionInfo(c.Name); }
                    catch { return null; }
                })
                .FirstOrDefault(r => r?.ISOCurrencySymbol.Equals(currencyCode, StringComparison.OrdinalIgnoreCase) == true);

            return region?.CurrencySymbol;
        }
        catch
        {
            return null;
        }
    }
}

