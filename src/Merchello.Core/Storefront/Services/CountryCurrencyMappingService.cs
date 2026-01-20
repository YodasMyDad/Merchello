namespace Merchello.Core.Storefront.Services;

/// <summary>
/// Default implementation of country-to-currency mapping.
/// </summary>
public class CountryCurrencyMappingService : ICountryCurrencyMappingService
{
    private static readonly Dictionary<string, string> CountryCurrencyMap = new(StringComparer.OrdinalIgnoreCase)
    {
        // North America
        ["US"] = "USD",
        ["CA"] = "CAD",
        ["MX"] = "MXN",

        // Europe - Eurozone
        ["DE"] = "EUR",
        ["FR"] = "EUR",
        ["IT"] = "EUR",
        ["ES"] = "EUR",
        ["NL"] = "EUR",
        ["BE"] = "EUR",
        ["AT"] = "EUR",
        ["PT"] = "EUR",
        ["IE"] = "EUR",
        ["FI"] = "EUR",
        ["GR"] = "EUR",
        ["LU"] = "EUR",
        ["SK"] = "EUR",
        ["SI"] = "EUR",
        ["EE"] = "EUR",
        ["LV"] = "EUR",
        ["LT"] = "EUR",
        ["CY"] = "EUR",
        ["MT"] = "EUR",

        // Europe - Non-Eurozone
        ["GB"] = "GBP",
        ["CH"] = "CHF",
        ["SE"] = "SEK",
        ["NO"] = "NOK",
        ["DK"] = "DKK",
        ["PL"] = "PLN",
        ["CZ"] = "CZK",
        ["HU"] = "HUF",
        ["RO"] = "RON",
        ["BG"] = "BGN",

        // Asia Pacific
        ["JP"] = "JPY",
        ["CN"] = "CNY",
        ["AU"] = "AUD",
        ["NZ"] = "NZD",
        ["KR"] = "KRW",
        ["IN"] = "INR",
        ["SG"] = "SGD",
        ["HK"] = "HKD",
        ["TW"] = "TWD",
        ["TH"] = "THB",
        ["MY"] = "MYR",
        ["ID"] = "IDR",
        ["PH"] = "PHP",
        ["VN"] = "VND",

        // Middle East
        ["AE"] = "AED",
        ["SA"] = "SAR",
        ["IL"] = "ILS",
        ["QA"] = "QAR",
        ["KW"] = "KWD",
        ["BH"] = "BHD",
        ["OM"] = "OMR",

        // South America
        ["BR"] = "BRL",
        ["AR"] = "ARS",
        ["CL"] = "CLP",
        ["CO"] = "COP",
        ["PE"] = "PEN",

        // Africa
        ["ZA"] = "ZAR",
        ["NG"] = "NGN",
        ["EG"] = "EGP",
        ["KE"] = "KES",
        ["MA"] = "MAD"
    };

    public string GetCurrencyForCountry(string countryCode)
    {
        if (string.IsNullOrWhiteSpace(countryCode))
            return "USD";

        return CountryCurrencyMap.TryGetValue(countryCode.ToUpperInvariant(), out var currency)
            ? currency
            : "USD";
    }
}
