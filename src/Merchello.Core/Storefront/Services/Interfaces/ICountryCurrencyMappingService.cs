namespace Merchello.Core.Storefront.Services.Interfaces;

/// <summary>
/// Maps ISO 3166-1 alpha-2 country codes to ISO 4217 currency codes.
/// </summary>
public interface ICountryCurrencyMappingService
{
    /// <summary>
    /// Gets the default currency code for a country.
    /// </summary>
    /// <param name="countryCode">ISO 3166-1 alpha-2 country code (e.g., "US", "GB")</param>
    /// <returns>ISO 4217 currency code (e.g., "USD", "GBP"), defaults to "USD" if not mapped</returns>
    string GetCurrencyForCountry(string countryCode);
}
