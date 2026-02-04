using System.Globalization;

namespace Merchello.Core.Shared.Helpers;

/// <summary>
/// Provides consistent currency symbol lookup across the application.
/// </summary>
/// <remarks>
/// Maps currency codes to their preferred "home" culture for consistent symbol display.
/// Without this, CultureInfo.GetCultures() returns cultures in non-deterministic order,
/// causing USD to sometimes show as "US$" instead of "$" depending on which culture matches first.
/// </remarks>
public static class CurrencySymbolHelper
{
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

    /// <summary>
    /// Gets the preferred culture for a currency code, if one is defined.
    /// </summary>
    /// <param name="currencyCode">The ISO currency code (e.g., "USD").</param>
    /// <returns>The preferred CultureInfo, or null if not found.</returns>
    public static CultureInfo? GetPreferredCulture(string currencyCode)
    {
        var code = NormalizeCurrencyCode(currencyCode);

        if (PreferredCultureByCurrency.TryGetValue(code, out var cultureName))
        {
            try
            {
                var culture = CultureInfo.GetCultureInfo(cultureName);
                var region = new RegionInfo(culture.Name);
                if (region.ISOCurrencySymbol.Equals(code, StringComparison.OrdinalIgnoreCase))
                    return culture;
            }
            catch
            {
                // Fall through to return null
            }
        }

        return null;
    }

    /// <summary>
    /// Gets the currency symbol for a currency code.
    /// </summary>
    /// <param name="currencyCode">The ISO currency code (e.g., "USD").</param>
    /// <returns>The currency symbol (e.g., "$"), or the currency code if no symbol found.</returns>
    public static string GetSymbol(string currencyCode)
    {
        var code = NormalizeCurrencyCode(currencyCode);

        // Try preferred culture first for consistent results
        var preferredCulture = GetPreferredCulture(code);
        if (preferredCulture != null)
            return preferredCulture.NumberFormat.CurrencySymbol;

        // Fallback: enumerate all cultures to find one with this currency
        try
        {
            var region = CultureInfo.GetCultures(CultureTypes.SpecificCultures)
                .Select(c =>
                {
                    try { return new RegionInfo(c.Name); }
                    catch { return null; }
                })
                .FirstOrDefault(r => r?.ISOCurrencySymbol.Equals(code, StringComparison.OrdinalIgnoreCase) == true);

            return region?.CurrencySymbol ?? code;
        }
        catch
        {
            return code;
        }
    }

    private static string NormalizeCurrencyCode(string currencyCode)
        => string.IsNullOrWhiteSpace(currencyCode) ? "USD" : currencyCode.Trim().ToUpperInvariant();
}
