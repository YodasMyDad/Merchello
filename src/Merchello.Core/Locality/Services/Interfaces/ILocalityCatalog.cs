using Merchello.Core.Locality.Models;

namespace Merchello.Core.Locality.Services.Interfaces;

public interface ILocalityCatalog
{
    /// <summary>
    /// Gets all countries from the ISO catalog (unfiltered).
    /// </summary>
    Task<IReadOnlyCollection<CountryInfo>> GetCountriesAsync(CancellationToken ct = default);

    /// <summary>
    /// Gets countries filtered by store settings (AllowedCountries).
    /// If no restrictions are configured, returns all countries.
    /// </summary>
    Task<IReadOnlyCollection<CountryInfo>> GetStoreCountriesAsync(CancellationToken ct = default);

    /// <summary>
    /// Gets regions/subdivisions for a country.
    /// </summary>
    Task<IReadOnlyCollection<SubdivisionInfo>> GetRegionsAsync(string countryCode, CancellationToken ct = default);

    /// <summary>
    /// Try to get the display name for a country code.
    /// </summary>
    Task<string?> TryGetCountryNameAsync(string countryCode, CancellationToken ct = default);

    /// <summary>
    /// Try to get the display name for a region code within a country.
    /// </summary>
    Task<string?> TryGetRegionNameAsync(string countryCode, string regionCode, CancellationToken ct = default);
}

