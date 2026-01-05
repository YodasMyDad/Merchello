using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Merchello.Core.Locality.Data;
using Merchello.Core.Locality.Models;
using Merchello.Core.Locality.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Caching.Models;
using Merchello.Core.Caching.Services.Interfaces;
using Microsoft.Extensions.Options;

namespace Merchello.Core.Locality.Services;

public class DefaultLocalityCatalog(
    IOptions<CacheOptions> cacheOptions,
    ICacheService cacheService)
    : ILocalityCatalog
{
    private readonly Lazy<IReadOnlyDictionary<string, string>> _countries = new(BuildCountryMap, isThreadSafe: true);
    private readonly CacheOptions _cacheOptions = cacheOptions.Value;

    public Task<IReadOnlyCollection<CountryInfo>> GetCountriesAsync(CancellationToken ct = default)
    {
        var list = _countries.Value
            .OrderBy(kv => kv.Value, StringComparer.OrdinalIgnoreCase)
            .Select(kv => new CountryInfo(kv.Key, kv.Value))
            .ToList()
            .AsReadOnly();
        return Task.FromResult<IReadOnlyCollection<CountryInfo>>(list);
    }

    public Task<IReadOnlyCollection<CountryInfo>> GetStoreCountriesAsync(CancellationToken ct = default)
    {
        // Returns all countries - use LocationsService.GetAvailableCountriesAsync() for
        // countries that warehouses can actually ship to
        var list = _countries.Value
            .OrderBy(kv => kv.Value, StringComparer.OrdinalIgnoreCase)
            .Select(kv => new CountryInfo(kv.Key, kv.Value))
            .ToList()
            .AsReadOnly();

        return Task.FromResult<IReadOnlyCollection<CountryInfo>>(list);
    }

    public async Task<IReadOnlyCollection<SubdivisionInfo>> GetRegionsAsync(string countryCode, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(countryCode))
        {
            return Array.Empty<SubdivisionInfo>();
        }

        var cc = countryCode.ToUpperInvariant();
        var key = $"locality:regions:{cc}";
        var ttl = TimeSpan.FromSeconds(_cacheOptions.LocalityRegionsTtlSeconds);
        var tags = new[] { CacheTags.LocalityRegions, CacheTags.LocalityRegionsCountry(cc) };
        var list = await cacheService.GetOrCreateAsync(key, cancel =>
        {
            var map = GetRegionMapFor(cc);
            if (map.Count == 0)
            {
                return Task.FromResult<IReadOnlyCollection<SubdivisionInfo>>(Array.Empty<SubdivisionInfo>());
            }
            var items = map
                .OrderBy(kv => kv.Value, StringComparer.OrdinalIgnoreCase)
                .Select(kv => new SubdivisionInfo(cc, kv.Key.ToUpperInvariant(), kv.Value))
                .ToList()
                .AsReadOnly();
            return Task.FromResult<IReadOnlyCollection<SubdivisionInfo>>(items);
        }, ttl, tags, ct);

        return list;
    }

    public Task<string?> TryGetCountryNameAsync(string countryCode, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(countryCode)) return Task.FromResult<string?>(null);
        _countries.Value.TryGetValue(countryCode.ToUpperInvariant(), out var name);
        return Task.FromResult<string?>(name);
    }

    public async Task<string?> TryGetRegionNameAsync(string countryCode, string regionCode, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(countryCode) || string.IsNullOrWhiteSpace(regionCode)) return null;
        var regions = await GetRegionsAsync(countryCode, ct);
        return regions.FirstOrDefault(r => r.RegionCode.Equals(regionCode, StringComparison.OrdinalIgnoreCase))?.Name;
    }

    private static IReadOnlyDictionary<string, string> BuildCountryMap()
    {
        // Build from available cultures to avoid hardcoding; provides comprehensive ISO country names.
        var codes = CultureInfo
            .GetCultures(CultureTypes.SpecificCultures)
            .Select(c =>
            {
                try
                {
                    // Using name avoids LCID issues for customized cultures
                    return new RegionInfo(c.Name);
                }
                catch (ArgumentException)
                {
                    // Expected for language-only cultures (e.g., "en" without region) or
                    // custom cultures that don't map to a geographic region
                    return null;
                }
            })
            .Where(r => r != null)!
            .Cast<RegionInfo>()
            .GroupBy(r => r.TwoLetterISORegionName, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.First())
            .Where(r => r.TwoLetterISORegionName.Length == 2 && r.TwoLetterISORegionName != "ZZ")
            .ToDictionary(r => r.TwoLetterISORegionName.ToUpperInvariant(), r => r.EnglishName, StringComparer.OrdinalIgnoreCase);

        // Ensure common special codes exist if not present
        if (!codes.ContainsKey("GB")) codes["GB"] = "United Kingdom";

        // Add Crown Dependencies and special territories from LocalityData
        foreach (var (code, name) in LocalityData.AdditionalCountries)
        {
            codes.TryAdd(code, name);
        }

        return new Dictionary<string, string>(codes, StringComparer.OrdinalIgnoreCase);
    }

    private static IReadOnlyDictionary<string, string> GetRegionMapFor(string countryCode)
    {
        return LocalityData.GetSubdivisions(countryCode);
    }
}
