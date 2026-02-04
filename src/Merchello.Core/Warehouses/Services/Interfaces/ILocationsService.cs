using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Merchello.Core.Warehouses.Models;
using Merchello.Core.Warehouses.Services.Parameters;

namespace Merchello.Core.Warehouses.Services.Interfaces;

public interface ILocationsService
{
    /// <summary>
    /// Returns the distinct list of country codes and display names
    /// that are serviceable by any configured warehouse, taking into
    /// account explicit includes and excludes.
    /// </summary>
    Task<IReadOnlyCollection<CountryAvailability>> GetAvailableCountriesAsync(
        GetAvailableCountriesParameters parameters,
        CancellationToken ct = default);

    /// <summary>
    /// Returns the list of available regions (state/province codes) for the given country code,
    /// after applying warehouse include/exclude rules. If the system has no region catalog for
    /// the country or availability cannot be enumerated, returns an empty collection.
    /// </summary>
    Task<IReadOnlyCollection<RegionAvailability>> GetAvailableRegionsAsync(
        GetAvailableRegionsParameters parameters,
        CancellationToken ct = default);

    /// <summary>
    /// Returns the list of countries that a specific warehouse can service,
    /// based on its service region configuration.
    /// If the warehouse has no service regions, returns all countries (unrestricted).
    /// </summary>
    Task<IReadOnlyCollection<CountryAvailability>> GetAvailableCountriesForWarehouseAsync(
        GetAvailableCountriesForWarehouseParameters parameters,
        CancellationToken ct = default);

    /// <summary>
    /// Returns the list of regions (state/province codes) that a specific warehouse
    /// can service for a given country, based on its service region configuration.
    /// </summary>
    Task<IReadOnlyCollection<RegionAvailability>> GetAvailableRegionsForWarehouseAsync(
        GetAvailableRegionsForWarehouseParameters parameters,
        CancellationToken ct = default);
}
