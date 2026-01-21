namespace Merchello.Core.Fulfilment.Models;

/// <summary>
/// Status of a fulfilment sync operation.
/// </summary>
public enum FulfilmentSyncStatus
{
    /// <summary>
    /// Sync is queued but not started
    /// </summary>
    Pending = 0,

    /// <summary>
    /// Sync is currently running
    /// </summary>
    Running = 1,

    /// <summary>
    /// Sync completed successfully
    /// </summary>
    Completed = 2,

    /// <summary>
    /// Sync failed
    /// </summary>
    Failed = 3
}
