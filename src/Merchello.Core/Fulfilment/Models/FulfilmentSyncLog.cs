using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Fulfilment.Models;

/// <summary>
/// Log entry for a fulfilment sync operation.
/// </summary>
public class FulfilmentSyncLog
{
    /// <summary>
    /// Unique identifier
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// FK to the provider configuration
    /// </summary>
    public Guid ProviderConfigurationId { get; set; }

    /// <summary>
    /// The provider configuration
    /// </summary>
    public virtual FulfilmentProviderConfiguration? ProviderConfiguration { get; set; }

    /// <summary>
    /// Type of sync operation
    /// </summary>
    public FulfilmentSyncType SyncType { get; set; }

    /// <summary>
    /// Current status of the sync
    /// </summary>
    public FulfilmentSyncStatus Status { get; set; } = FulfilmentSyncStatus.Pending;

    /// <summary>
    /// Total items attempted
    /// </summary>
    public int ItemsProcessed { get; set; }

    /// <summary>
    /// Items that succeeded
    /// </summary>
    public int ItemsSucceeded { get; set; }

    /// <summary>
    /// Items that failed
    /// </summary>
    public int ItemsFailed { get; set; }

    /// <summary>
    /// Error details if failed
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// When the sync started
    /// </summary>
    public DateTime? StartedAt { get; set; }

    /// <summary>
    /// When the sync completed
    /// </summary>
    public DateTime? CompletedAt { get; set; }
}
