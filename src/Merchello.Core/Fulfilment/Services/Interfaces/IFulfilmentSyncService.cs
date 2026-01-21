using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Fulfilment.Services.Parameters;
using Merchello.Core.Shared.Models;

namespace Merchello.Core.Fulfilment.Services.Interfaces;

/// <summary>
/// Service for syncing products and inventory with fulfilment providers.
/// </summary>
public interface IFulfilmentSyncService
{
    /// <summary>
    /// Syncs products to a fulfilment provider.
    /// </summary>
    Task<FulfilmentSyncLog> SyncProductsAsync(Guid providerConfigId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Syncs inventory from a fulfilment provider.
    /// </summary>
    Task<FulfilmentSyncLog> SyncInventoryAsync(Guid providerConfigId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets sync history for a provider configuration.
    /// </summary>
    Task<PaginatedList<FulfilmentSyncLog>> GetSyncHistoryAsync(FulfilmentSyncLogQueryParameters parameters, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a specific sync log by ID.
    /// </summary>
    Task<FulfilmentSyncLog?> GetSyncLogByIdAsync(Guid id, CancellationToken cancellationToken = default);
}
