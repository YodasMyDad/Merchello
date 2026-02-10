namespace Merchello.Core.Fulfilment;

/// <summary>
/// Configuration settings for the fulfilment system.
/// Loaded from appsettings.json under "Merchello:Fulfilment".
/// </summary>
public class FulfilmentSettings
{
    /// <summary>
    /// Interval in minutes for polling 3PLs for order status updates.
    /// </summary>
    public int PollingIntervalMinutes { get; set; } = 15;

    /// <summary>
    /// Maximum number of retry attempts for failed order submissions.
    /// </summary>
    public int MaxRetryAttempts { get; set; } = 5;

    /// <summary>
    /// Delay intervals in minutes for retry attempts (exponential backoff).
    /// </summary>
    public int[] RetryDelaysMinutes { get; set; } = [5, 15, 30, 60, 120];

    /// <summary>
    /// Interval in minutes for inventory sync.
    /// </summary>
    public int InventorySyncIntervalMinutes { get; set; } = 60;

    /// <summary>
    /// Whether to automatically sync products when they are saved.
    /// </summary>
    public bool ProductSyncOnSave { get; set; }

    /// <summary>
    /// Number of days to retain sync logs.
    /// </summary>
    public int SyncLogRetentionDays { get; set; } = 30;

    /// <summary>
    /// Number of days to retain webhook logs.
    /// </summary>
    public int WebhookLogRetentionDays { get; set; } = 7;

    /// <summary>
    /// Feature flags for Supplier Direct fulfilment provider rollout.
    /// </summary>
    public SupplierDirectFeatureSettings SupplierDirect { get; set; } = new();

    /// <summary>
    /// Gets the next retry delay based on the current retry count.
    /// </summary>
    public TimeSpan GetNextRetryDelay(int retryCount)
    {
        var index = Math.Clamp(retryCount, 0, RetryDelaysMinutes.Length - 1);
        return TimeSpan.FromMinutes(RetryDelaysMinutes[index]);
    }
}
