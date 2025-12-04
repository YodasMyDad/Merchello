using Umbraco.Cms.Core.Notifications;

namespace Merchello.Core.Notifications.Base;

/// <summary>
/// Base class for all Merchello notifications.
/// Provides a State dictionary for sharing data between Before and After notification handlers.
/// </summary>
public abstract class MerchelloNotification : INotification
{
    /// <summary>
    /// Gets a dictionary for sharing state between handlers.
    /// Useful for passing data from Before handlers to After handlers.
    /// </summary>
    /// <example>
    /// // In a Before handler:
    /// notification.State["originalPrice"] = product.Price;
    ///
    /// // In an After handler:
    /// var originalPrice = notification.State.TryGetValue("originalPrice", out var price) ? (decimal)price : 0;
    /// </example>
    public IDictionary<string, object?> State { get; } = new Dictionary<string, object?>();
}
