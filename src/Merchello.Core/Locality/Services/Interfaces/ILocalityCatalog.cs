using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Merchello.Core.Locality.Services.Interfaces;

public interface ILocalityCatalog
{
    Task<IReadOnlyCollection<CountryInfo>> GetCountriesAsync(CancellationToken ct = default);
    Task<IReadOnlyCollection<SubdivisionInfo>> GetRegionsAsync(string countryCode, CancellationToken ct = default);
    Task<string?> TryGetCountryNameAsync(string countryCode, CancellationToken ct = default);
    Task<string?> TryGetRegionNameAsync(string countryCode, string regionCode, CancellationToken ct = default);
}

public record CountryInfo(string Code, string Name);
public record SubdivisionInfo(string CountryCode, string RegionCode, string Name);

