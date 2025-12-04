using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Merchello.Core.Warehouses.Models;

namespace Merchello.Core.Warehouses.Services.Interfaces;

public interface ILocationsService
{
    /// <summary>
    /// Returns the distinct list of country codes and display names
    /// that are serviceable by any configured warehouse, taking into
    /// account explicit includes and excludes.
    /// </summary>
    Task<IReadOnlyCollection<CountryAvailability>> GetAvailableCountriesAsync(CancellationToken ct = default);

    /// <summary>
    /// Returns the list of available regions (state/province codes) for the given country code,
    /// after applying warehouse include/exclude rules. If the system has no region catalog for
    /// the country or availability cannot be enumerated, returns an empty collection.
    /// </summary>
    Task<IReadOnlyCollection<RegionAvailability>> GetAvailableRegionsAsync(string countryCode, CancellationToken ct = default);
}
