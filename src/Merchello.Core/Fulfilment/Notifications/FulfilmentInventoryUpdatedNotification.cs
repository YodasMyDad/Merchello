using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Fulfilment.Notifications;

/// <summary>
/// Published after inventory has been synced from a fulfilment provider.
/// </summary>
public class FulfilmentInventoryUpdatedNotification(
    FulfilmentProviderConfiguration providerConfiguration,
    FulfilmentSyncLog syncLog,
    IReadOnlyList<FulfilmentInventoryLevel> inventoryLevels) : MerchelloNotification
{
    /// <summary>
    /// Gets the fulfilment provider configuration.
    /// </summary>
    public FulfilmentProviderConfiguration ProviderConfiguration { get; } = providerConfiguration;

    /// <summary>
    /// Gets the sync log entry.
    /// </summary>
    public FulfilmentSyncLog SyncLog { get; } = syncLog;

    /// <summary>
    /// Gets the inventory levels that were synced.
    /// </summary>
    public IReadOnlyList<FulfilmentInventoryLevel> InventoryLevels { get; } = inventoryLevels;
}
