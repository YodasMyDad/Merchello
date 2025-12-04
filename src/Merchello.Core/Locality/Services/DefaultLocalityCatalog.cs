using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Merchello.Core.Locality.Models;
using Merchello.Core.Locality.Services.Interfaces;
using Merchello.Core.Shared.Options;
using Merchello.Core.Shared.Services;
using Microsoft.Extensions.Options;

namespace Merchello.Core.Locality.Services;

public class DefaultLocalityCatalog(IOptions<CacheOptions> cacheOptions, CacheService cacheService)
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
                catch
                {
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

        return new Dictionary<string, string>(codes, StringComparer.OrdinalIgnoreCase);
    }

    private static IReadOnlyDictionary<string, string> GetRegionMapFor(string countryCode)
    {
        return countryCode switch
        {
            // United Kingdom
            "GB" => new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["ENG"] = "England",
                ["SCT"] = "Scotland",
                ["WLS"] = "Wales",
                ["NIR"] = "Northern Ireland"
            },
            // United States (50 states + DC)
            "US" => new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["AL"]="Alabama",["AK"]="Alaska",["AZ"]="Arizona",["AR"]="Arkansas",["CA"]="California",
                ["CO"]="Colorado",["CT"]="Connecticut",["DE"]="Delaware",["FL"]="Florida",["GA"]="Georgia",
                ["HI"]="Hawaii",["ID"]="Idaho",["IL"]="Illinois",["IN"]="Indiana",["IA"]="Iowa",
                ["KS"]="Kansas",["KY"]="Kentucky",["LA"]="Louisiana",["ME"]="Maine",["MD"]="Maryland",
                ["MA"]="Massachusetts",["MI"]="Michigan",["MN"]="Minnesota",["MS"]="Mississippi",["MO"]="Missouri",
                ["MT"]="Montana",["NE"]="Nebraska",["NV"]="Nevada",["NH"]="New Hampshire",["NJ"]="New Jersey",
                ["NM"]="New Mexico",["NY"]="New York",["NC"]="North Carolina",["ND"]="North Dakota",["OH"]="Ohio",
                ["OK"]="Oklahoma",["OR"]="Oregon",["PA"]="Pennsylvania",["RI"]="Rhode Island",["SC"]="South Carolina",
                ["SD"]="South Dakota",["TN"]="Tennessee",["TX"]="Texas",["UT"]="Utah",["VT"]="Vermont",
                ["VA"]="Virginia",["WA"]="Washington",["WV"]="West Virginia",["WI"]="Wisconsin",["WY"]="Wyoming",
                ["DC"]="District of Columbia"
            },
            // Canada
            "CA" => new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["AB"]="Alberta",["BC"]="British Columbia",["MB"]="Manitoba",["NB"]="New Brunswick",
                ["NL"]="Newfoundland and Labrador",["NS"]="Nova Scotia",["NT"]="Northwest Territories",
                ["NU"]="Nunavut",["ON"]="Ontario",["PE"]="Prince Edward Island",["QC"]="Quebec",
                ["SK"]="Saskatchewan",["YT"]="Yukon"
            },
            // Australia
            "AU" => new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["ACT"]="Australian Capital Territory",["NSW"]="New South Wales",["NT"]="Northern Territory",
                ["QLD"]="Queensland",["SA"]="South Australia",["TAS"]="Tasmania",["VIC"]="Victoria",["WA"]="Western Australia"
            },
            _ => new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        };
    }
}
