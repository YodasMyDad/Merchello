using Merchello.Core.Warehouses.Models;
using Merchello.Core.Warehouses.Services.Interfaces;
using Merchello.Core.Warehouses.Services.Parameters;

namespace Merchello.Core.Checkout.Services;

internal sealed class NoopLocationsService : ILocationsService
{
    public Task<IReadOnlyCollection<CountryAvailability>> GetAvailableCountriesAsync(
        GetAvailableCountriesParameters parameters,
        CancellationToken ct = default)
    {
        return Task.FromResult<IReadOnlyCollection<CountryAvailability>>(Array.Empty<CountryAvailability>());
    }

    public Task<IReadOnlyCollection<RegionAvailability>> GetAvailableRegionsAsync(
        GetAvailableRegionsParameters parameters,
        CancellationToken ct = default)
    {
        return Task.FromResult<IReadOnlyCollection<RegionAvailability>>(Array.Empty<RegionAvailability>());
    }

    public Task<IReadOnlyCollection<CountryAvailability>> GetAvailableCountriesForWarehouseAsync(
        GetAvailableCountriesForWarehouseParameters parameters,
        CancellationToken ct = default)
    {
        return Task.FromResult<IReadOnlyCollection<CountryAvailability>>(Array.Empty<CountryAvailability>());
    }

    public Task<IReadOnlyCollection<RegionAvailability>> GetAvailableRegionsForWarehouseAsync(
        GetAvailableRegionsForWarehouseParameters parameters,
        CancellationToken ct = default)
    {
        return Task.FromResult<IReadOnlyCollection<RegionAvailability>>(Array.Empty<RegionAvailability>());
    }
}
