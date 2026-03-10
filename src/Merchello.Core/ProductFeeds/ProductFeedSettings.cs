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

    /// <summary>
    /// URL for Google's ES256 public key used to verify auto discount JWT signatures.
    /// </summary>
    public string GoogleAutoDiscountPublicKeyUrl { get; set; } = "https://www.gstatic.com/shopping/merchant/auto_discount/signing_key.json";
}
