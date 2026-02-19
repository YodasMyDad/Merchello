namespace Merchello.Core.Upsells.Models;

/// <summary>
/// Configuration settings for the Upsells feature.
/// Bound via services.Configure&lt;UpsellSettings&gt;(configuration.GetSection("Merchello:Upsells")).
/// </summary>
public class UpsellSettings
{
    /// <summary>
    /// Maximum number of upsell suggestions returned per display location.
    /// Individual rules may return fewer products via their MaxProducts setting.
    /// </summary>
    public int MaxSuggestionsPerLocation { get; set; } = 3;

    /// <summary>
    /// Duration in seconds to cache active upsell rules.
    /// Rules are invalidated on create/update/delete.
    /// </summary>
    public int CacheDurationSeconds { get; set; } = 300;

    /// <summary>
    /// Number of days to retain analytics events before cleanup.
    /// </summary>
    public int EventRetentionDays { get; set; } = 90;

    /// <summary>
    /// Whether to enable post-purchase upsells.
    /// Requires at least one payment provider with SupportsVaultedPayments = true.
    /// </summary>
    public bool EnablePostPurchase { get; set; } = true;

    /// <summary>
    /// Maximum duration in minutes for the post-purchase window.
    /// After this time, the post-purchase page will redirect to confirmation.
    /// Default: 5 minutes.
    /// </summary>
    public int PostPurchaseFulfillmentHoldMinutes { get; set; } = 5;
}
