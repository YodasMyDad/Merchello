using Merchello.Core.Notifications.Base;
using Merchello.Core.Upsells.Models;

namespace Merchello.Core.Upsells.Extensions;

public static class MerchelloNotificationUpsellExtensions
{
    private const string StateKey = "UpsellSuggestions";

    /// <summary>
    /// Gets the upsell suggestions attached to this notification by the enrichment handler.
    /// Returns an empty list if no suggestions are available.
    /// </summary>
    public static List<UpsellSuggestion> GetUpsellSuggestions(this MerchelloNotification notification)
    {
        if (notification.State.TryGetValue(StateKey, out var raw) &&
            raw is List<UpsellSuggestion> suggestions)
        {
            return suggestions;
        }

        return [];
    }

    /// <summary>
    /// Returns true if the notification has any upsell suggestions attached.
    /// </summary>
    public static bool HasUpsellSuggestions(this MerchelloNotification notification)
    {
        return notification.State.TryGetValue(StateKey, out var raw) &&
               raw is List<UpsellSuggestion> { Count: > 0 };
    }
}
