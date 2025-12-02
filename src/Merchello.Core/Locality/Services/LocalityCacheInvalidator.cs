using System.Threading;
using System.Threading.Tasks;
using Merchello.Core.Locality.Services.Interfaces;
using Merchello.Core.Shared.Services;

namespace Merchello.Core.Locality.Services;

public class LocalityCacheInvalidator(CacheService cache) : ILocalityCacheInvalidator
{
    public Task InvalidateAllRegionsAsync(CancellationToken ct = default)
    {
        return cache.RemoveByTagAsync(CacheTags.LocalityRegions, ct);
    }

    public Task InvalidateCountryRegionsAsync(string countryCode, CancellationToken ct = default)
    {
        return cache.RemoveByTagAsync(CacheTags.LocalityRegionsCountry(countryCode), ct);
    }
}

