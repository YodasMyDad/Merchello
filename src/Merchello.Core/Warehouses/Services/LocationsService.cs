using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Merchello.Core.Data;
using Merchello.Core.Locality.Services.Interfaces;
using Merchello.Core.Warehouses.Models;
using Merchello.Core.Warehouses.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Warehouses.Services;

public class LocationsService(IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider, ILocalityCatalog catalog) : ILocationsService
{
    public async Task<IReadOnlyCollection<CountryAvailability>> GetAvailableCountriesAsync(CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var warehouses = await scope.ExecuteWithContextAsync(async db =>
            await db.Warehouses
                .AsNoTracking()
                
                .ToListAsync(ct));
        scope.Complete();

        HashSet<string> included = new(StringComparer.OrdinalIgnoreCase);
        HashSet<string> excluded = new(StringComparer.OrdinalIgnoreCase);
        var hasWildcardInclude = false;

        foreach (var w in warehouses)
        {
            if (w.ServiceRegions == null || w.ServiceRegions.Count == 0)
            {
                // No explicit regions → treat as unrestricted, but we can't enumerate all codes
                // We'll fallback to warehouse address if set
                if (!string.IsNullOrWhiteSpace(w.Address?.CountryCode))
                {
                    included.Add(w.Address.CountryCode!);
                }
                continue;
            }

            foreach (var r in w.ServiceRegions)
            {
                // Wildcard rules: only treat as include-all for countries when no specific region code
                if (string.Equals(r.CountryCode, "*", StringComparison.Ordinal))
                {
                    if (!r.IsExcluded && string.IsNullOrWhiteSpace(r.StateOrProvinceCode))
                    {
                        hasWildcardInclude = true;
                    }
                    continue;
                }

                // State/province-specific rules should not affect country availability
                if (!string.IsNullOrWhiteSpace(r.StateOrProvinceCode))
                {
                    continue;
                }

                if (r.IsExcluded)
                {
                    excluded.Add(r.CountryCode);
                }
                else
                {
                    included.Add(r.CountryCode);
                }
            }
        }

        // If wildcard include is present, include all countries from catalog
        if (hasWildcardInclude)
        {
            var all = await catalog.GetCountriesAsync(ct);
            foreach (var c in all)
            {
                included.Add(c.Code);
            }
        }
        else if (included.Count == 0)
        {
            // No explicit regions: fallback to warehouse address country codes present.
            foreach (var w in warehouses)
            {
                if (!string.IsNullOrWhiteSpace(w.Address?.CountryCode))
                {
                    included.Add(w.Address.CountryCode!);
                }
            }
        }

        // Remove excluded
        included.ExceptWith(excluded);

        // Resolve display names via catalog
        var countryMap = (await catalog.GetCountriesAsync(ct)).ToDictionary(x => x.Code, x => x.Name, StringComparer.OrdinalIgnoreCase);

        var result = included
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(c => countryMap.TryGetValue(c, out var nm) ? nm : c, StringComparer.OrdinalIgnoreCase)
            .Select(code => new CountryAvailability(code.ToUpperInvariant(), countryMap.TryGetValue(code, out var name) ? name : code.ToUpperInvariant()))
            .ToList();

        return result;
    }

    public async Task<IReadOnlyCollection<RegionAvailability>> GetAvailableRegionsAsync(string countryCode, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(countryCode))
        {
            return Array.Empty<RegionAvailability>();
        }

        var code = countryCode.ToUpperInvariant();

        var regionsCatalog = await catalog.GetRegionsAsync(code, ct);
        var regionCatalog = regionsCatalog.ToDictionary(r => r.RegionCode, r => r.Name, StringComparer.OrdinalIgnoreCase);
        if (regionCatalog.Count == 0)
        {
            // No known regions for this country → signal UI to allow free text
            return Array.Empty<RegionAvailability>();
        }

        using var scope = efCoreScopeProvider.CreateScope();
        var warehouses = await scope.ExecuteWithContextAsync(async db =>
            await db.Warehouses
                .AsNoTracking()
                
                .ToListAsync(ct));
        scope.Complete();

        // Collect rules applicable to this country (including wildcard '*')
        var includeAll = false; // default allow-all
        var excludeAll = false; // default deny-all
        HashSet<string> include = new(StringComparer.OrdinalIgnoreCase);
        HashSet<string> exclude = new(StringComparer.OrdinalIgnoreCase);

        foreach (var w in warehouses)
        {
            foreach (var r in w.ServiceRegions)
            {
                var appliesToCountry = string.Equals(r.CountryCode, code, StringComparison.OrdinalIgnoreCase) || r.CountryCode == "*";
                if (!appliesToCountry)
                    continue;

                var hasRegion = !string.IsNullOrWhiteSpace(r.StateOrProvinceCode);
                if (!hasRegion)
                {
                    // Country-level rule
                    if (r.IsExcluded)
                    {
                        excludeAll = true; // default deny all unless re-included below
                    }
                    else
                    {
                        includeAll = true; // default include all unless excluded below
                    }
                }
                else
                {
                    if (r.IsExcluded)
                    {
                        exclude.Add(r.StateOrProvinceCode!);
                    }
                    else
                    {
                        include.Add(r.StateOrProvinceCode!);
                    }
                }
            }
        }

        // Compute allowed set
        var knownRegionCodes = new HashSet<string>(regionCatalog.Keys, StringComparer.OrdinalIgnoreCase);
        HashSet<string> allowed;

        if (includeAll)
        {
            allowed = new HashSet<string>(knownRegionCodes, StringComparer.OrdinalIgnoreCase);
            allowed.ExceptWith(exclude);
        }
        else if (excludeAll)
        {
            // Only explicit includes survive
            allowed = new HashSet<string>(include.Where(knownRegionCodes.Contains), StringComparer.OrdinalIgnoreCase);
        }
        else
        {
            // Default: everything known is allowed, minus explicit excludes, with explicit includes not strictly required
            allowed = new HashSet<string>(knownRegionCodes, StringComparer.OrdinalIgnoreCase);
            if (include.Count > 0)
            {
                // If explicit includes exist, use them as base instead (typical positive list)
                allowed = new HashSet<string>(include.Where(knownRegionCodes.Contains), StringComparer.OrdinalIgnoreCase);
            }
            allowed.ExceptWith(exclude);
        }

        var result = allowed
            .OrderBy(rc => regionCatalog.TryGetValue(rc, out var nm) ? nm : rc, StringComparer.OrdinalIgnoreCase)
            .Select(rc => new RegionAvailability(code, rc.ToUpperInvariant(), regionCatalog.TryGetValue(rc, out var name) ? name : rc.ToUpperInvariant()))
            .ToList();

        return result;
    }

    public async Task<IReadOnlyCollection<CountryAvailability>> GetAvailableCountriesForWarehouseAsync(Guid warehouseId, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var warehouse = await scope.ExecuteWithContextAsync(async db =>
            await db.Warehouses
                .AsNoTracking()
                
                .FirstOrDefaultAsync(w => w.Id == warehouseId, ct));
        scope.Complete();

        if (warehouse == null)
        {
            return [];
        }

        // Get full country list for lookups
        var allCountries = await catalog.GetCountriesAsync(ct);
        var countryMap = allCountries.ToDictionary(x => x.Code, x => x.Name, StringComparer.OrdinalIgnoreCase);

        // If warehouse has no service regions, it's unrestricted - return all countries
        if (warehouse.ServiceRegions == null || warehouse.ServiceRegions.Count == 0)
        {
            return allCountries
                .OrderBy(c => c.Name, StringComparer.OrdinalIgnoreCase)
                .Select(c => new CountryAvailability(c.Code.ToUpperInvariant(), c.Name))
                .ToList();
        }

        HashSet<string> included = new(StringComparer.OrdinalIgnoreCase);
        HashSet<string> excluded = new(StringComparer.OrdinalIgnoreCase);
        var hasWildcardInclude = false;

        foreach (var r in warehouse.ServiceRegions)
        {
            // Wildcard rules
            if (string.Equals(r.CountryCode, "*", StringComparison.Ordinal))
            {
                if (!r.IsExcluded && string.IsNullOrWhiteSpace(r.StateOrProvinceCode))
                {
                    hasWildcardInclude = true;
                }
                continue;
            }

            // State/province-specific rules should not affect country availability
            if (!string.IsNullOrWhiteSpace(r.StateOrProvinceCode))
            {
                continue;
            }

            if (r.IsExcluded)
            {
                excluded.Add(r.CountryCode);
            }
            else
            {
                included.Add(r.CountryCode);
            }
        }

        // If wildcard include, include all countries
        if (hasWildcardInclude)
        {
            foreach (var c in allCountries)
            {
                included.Add(c.Code);
            }
        }

        // Remove excluded
        included.ExceptWith(excluded);

        var result = included
            .OrderBy(c => countryMap.TryGetValue(c, out var nm) ? nm : c, StringComparer.OrdinalIgnoreCase)
            .Select(code => new CountryAvailability(code.ToUpperInvariant(), countryMap.TryGetValue(code, out var name) ? name : code.ToUpperInvariant()))
            .ToList();

        return result;
    }

    public async Task<IReadOnlyCollection<RegionAvailability>> GetAvailableRegionsForWarehouseAsync(Guid warehouseId, string countryCode, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(countryCode))
        {
            return [];
        }

        var code = countryCode.ToUpperInvariant();

        var regionsCatalog = await catalog.GetRegionsAsync(code, ct);
        var regionCatalog = regionsCatalog.ToDictionary(r => r.RegionCode, r => r.Name, StringComparer.OrdinalIgnoreCase);
        if (regionCatalog.Count == 0)
        {
            // No known regions for this country → signal UI to allow free text
            return [];
        }

        using var scope = efCoreScopeProvider.CreateScope();
        var warehouse = await scope.ExecuteWithContextAsync(async db =>
            await db.Warehouses
                .AsNoTracking()
                
                .FirstOrDefaultAsync(w => w.Id == warehouseId, ct));
        scope.Complete();

        if (warehouse == null)
        {
            return [];
        }

        // If warehouse has no service regions, it's unrestricted - return all regions
        if (warehouse.ServiceRegions == null || warehouse.ServiceRegions.Count == 0)
        {
            return regionsCatalog
                .OrderBy(r => r.Name, StringComparer.OrdinalIgnoreCase)
                .Select(r => new RegionAvailability(code, r.RegionCode.ToUpperInvariant(), r.Name))
                .ToList();
        }

        // Collect rules applicable to this country (including wildcard '*')
        var includeAll = false;
        var excludeAll = false;
        HashSet<string> include = new(StringComparer.OrdinalIgnoreCase);
        HashSet<string> exclude = new(StringComparer.OrdinalIgnoreCase);

        foreach (var r in warehouse.ServiceRegions)
        {
            var appliesToCountry = string.Equals(r.CountryCode, code, StringComparison.OrdinalIgnoreCase) || r.CountryCode == "*";
            if (!appliesToCountry)
                continue;

            var hasRegion = !string.IsNullOrWhiteSpace(r.StateOrProvinceCode);
            if (!hasRegion)
            {
                // Country-level rule
                if (r.IsExcluded)
                {
                    excludeAll = true;
                }
                else
                {
                    includeAll = true;
                }
            }
            else
            {
                if (r.IsExcluded)
                {
                    exclude.Add(r.StateOrProvinceCode!);
                }
                else
                {
                    include.Add(r.StateOrProvinceCode!);
                }
            }
        }

        // Compute allowed set
        var knownRegionCodes = new HashSet<string>(regionCatalog.Keys, StringComparer.OrdinalIgnoreCase);
        HashSet<string> allowed;

        if (includeAll)
        {
            allowed = new HashSet<string>(knownRegionCodes, StringComparer.OrdinalIgnoreCase);
            allowed.ExceptWith(exclude);
        }
        else if (excludeAll)
        {
            // Only explicit includes survive
            allowed = new HashSet<string>(include.Where(knownRegionCodes.Contains), StringComparer.OrdinalIgnoreCase);
        }
        else
        {
            // Default: everything known is allowed, minus explicit excludes
            allowed = new HashSet<string>(knownRegionCodes, StringComparer.OrdinalIgnoreCase);
            if (include.Count > 0)
            {
                // If explicit includes exist, use them as base instead
                allowed = new HashSet<string>(include.Where(knownRegionCodes.Contains), StringComparer.OrdinalIgnoreCase);
            }
            allowed.ExceptWith(exclude);
        }

        var result = allowed
            .OrderBy(rc => regionCatalog.TryGetValue(rc, out var nm) ? nm : rc, StringComparer.OrdinalIgnoreCase)
            .Select(rc => new RegionAvailability(code, rc.ToUpperInvariant(), regionCatalog.TryGetValue(rc, out var name) ? name : rc.ToUpperInvariant()))
            .ToList();

        return result;
    }
}

