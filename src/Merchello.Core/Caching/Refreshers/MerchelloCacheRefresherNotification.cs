using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Sync;

namespace Merchello.Core.Caching.Refreshers;

/// <summary>
/// Notification for Merchello cache refresh events.
/// </summary>
public class MerchelloCacheRefresherNotification : CacheRefresherNotification
{
    /// <summary>
    /// Initializes a new instance of the <see cref="MerchelloCacheRefresherNotification"/> class.
    /// </summary>
    public MerchelloCacheRefresherNotification(object messageObject, MessageType messageType)
        : base(messageObject, messageType)
    {
    }
}
