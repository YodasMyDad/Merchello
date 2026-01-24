using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Shipping.Services.Interfaces;

/// <summary>
/// Service for managing per-warehouse shipping provider configurations.
/// These configurations control markup, service exclusions, and delivery overrides
/// for dynamic shipping providers at a per-warehouse level.
/// </summary>
public interface IWarehouseProviderConfigService
{
    Task<WarehouseProviderConfig?> GetByIdAsync(Guid id, CancellationToken ct = default);

    Task<WarehouseProviderConfig?> GetByWarehouseAndProviderAsync(
        Guid warehouseId, string providerKey, CancellationToken ct = default);

    Task<IReadOnlyList<WarehouseProviderConfig>> GetByWarehouseAsync(
        Guid warehouseId, CancellationToken ct = default);

    Task<IReadOnlyList<WarehouseProviderConfig>> GetByProviderAsync(
        string providerKey, CancellationToken ct = default);

    Task<IReadOnlyList<WarehouseProviderConfig>> GetAllEnabledAsync(CancellationToken ct = default);

    Task<WarehouseProviderConfig> CreateAsync(WarehouseProviderConfig config, CancellationToken ct = default);

    Task<WarehouseProviderConfig> UpdateAsync(WarehouseProviderConfig config, CancellationToken ct = default);

    Task DeleteAsync(Guid id, CancellationToken ct = default);

    Task<bool> ExistsAsync(Guid warehouseId, string providerKey, CancellationToken ct = default);
}
