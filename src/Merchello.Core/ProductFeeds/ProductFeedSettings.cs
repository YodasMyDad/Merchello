namespace Merchello.Core.ProductFeeds;

/// <summary>
/// Configuration settings for scheduled product feed refresh.
/// Bound via services.Configure&lt;ProductFeedSettings&gt;(configuration.GetSection("Merchello:ProductFeeds")).
/// </summary>
public class ProductFeedSettings
{
    /// <summary>
    /// Enables or disables periodic rebuild of enabled feeds.
    /// </summary>
    public bool AutoRefreshEnabled { get; set; } = true;

    /// <summary>
    /// Interval in hours between scheduled rebuild runs.
    /// </summary>
    public int RefreshIntervalHours { get; set; } = 3;
}
