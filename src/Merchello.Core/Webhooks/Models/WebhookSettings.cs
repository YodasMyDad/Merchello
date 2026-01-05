namespace Merchello.Core.Webhooks.Models;

/// <summary>
/// Configuration settings for the webhook system.
/// </summary>
public class WebhookSettings
{
    /// <summary>
    /// Whether the webhook system is enabled.
    /// </summary>
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// Maximum number of retry attempts for failed deliveries.
    /// </summary>
    public int MaxRetries { get; set; } = 5;

    /// <summary>
    /// Delay in seconds between retries. Array index = attempt number - 1.
    /// Default: 1min, 5min, 15min, 1hr, 4hr
    /// </summary>
    public int[] RetryDelaysSeconds { get; set; } = [60, 300, 900, 3600, 14400];

    /// <summary>
    /// Interval in seconds between processing pending deliveries.
    /// </summary>
    public int DeliveryIntervalSeconds { get; set; } = 10;

    /// <summary>
    /// Default request timeout in seconds.
    /// </summary>
    public int DefaultTimeoutSeconds { get; set; } = 30;

    /// <summary>
    /// Maximum payload size in bytes.
    /// </summary>
    public int MaxPayloadSizeBytes { get; set; } = 1_000_000;

    /// <summary>
    /// Number of days to retain delivery logs.
    /// </summary>
    public int DeliveryLogRetentionDays { get; set; } = 30;
}
