using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Fulfilment.Notifications;

/// <summary>
/// Published after products have been synced to a fulfilment provider.
/// </summary>
public class FulfilmentProductSyncedNotification(
    FulfilmentProviderConfiguration providerConfiguration,
    FulfilmentSyncLog syncLog) : MerchelloNotification
{
    /// <summary>
    /// Gets the fulfilment provider configuration.
    /// </summary>
    public FulfilmentProviderConfiguration ProviderConfiguration { get; } = providerConfiguration;

    /// <summary>
    /// Gets the sync log entry.
    /// </summary>
    public FulfilmentSyncLog SyncLog { get; } = syncLog;
}
