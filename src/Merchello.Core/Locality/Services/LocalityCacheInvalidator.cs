using Merchello.Core.Caching.Services.Interfaces;
using Merchello.Core.Locality.Services.Interfaces;

namespace Merchello.Core.Locality.Services;

public class LocalityCacheInvalidator(ICacheService cache) : ILocalityCacheInvalidator
{
    public Task InvalidateAllRegionsAsync(CancellationToken ct = default)
    {
        // Clear all locality cache using the prefix pattern
        return cache.RemoveByTagAsync(Constants.CacheTags.Locality, ct);
    }

    public Task InvalidateCountryRegionsAsync(string countryCode, CancellationToken ct = default)
    {
        // Clear specific country's region cache
        var key = $"{Constants.CacheKeys.LocalityRegionsPrefix}{countryCode.ToUpperInvariant()}";
        return cache.RemoveAsync(key, ct);
    }
}
