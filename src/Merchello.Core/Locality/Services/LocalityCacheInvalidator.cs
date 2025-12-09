using Merchello.Core.Caching.Models;
using Merchello.Core.Caching.Services.Interfaces;
using Merchello.Core.Locality.Services.Interfaces;

namespace Merchello.Core.Locality.Services;

public class LocalityCacheInvalidator(ICacheService cache) : ILocalityCacheInvalidator
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
