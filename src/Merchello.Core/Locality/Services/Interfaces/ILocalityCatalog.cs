using Merchello.Core.Locality.Models;

namespace Merchello.Core.Locality.Services.Interfaces;

public interface ILocalityCatalog
{
    Task<IReadOnlyCollection<CountryInfo>> GetCountriesAsync(CancellationToken ct = default);
    Task<IReadOnlyCollection<SubdivisionInfo>> GetRegionsAsync(string countryCode, CancellationToken ct = default);
    Task<string?> TryGetCountryNameAsync(string countryCode, CancellationToken ct = default);
    Task<string?> TryGetRegionNameAsync(string countryCode, string regionCode, CancellationToken ct = default);
}

