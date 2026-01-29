using Merchello.Core.Upsells.Models;

namespace Merchello.Core.Upsells.Extensions;

public static class UpsellExtensions
{
    /// <summary>
    /// Gets the display label for an upsell status.
    /// </summary>
    public static string GetStatusLabel(this UpsellStatus status)
    {
        return status switch
        {
            UpsellStatus.Draft => "Draft",
            UpsellStatus.Active => "Active",
            UpsellStatus.Scheduled => "Scheduled",
            UpsellStatus.Expired => "Expired",
            UpsellStatus.Disabled => "Disabled",
            _ => "Unknown"
        };
    }

    /// <summary>
    /// Gets the color/CSS class for an upsell status badge.
    /// </summary>
    public static string GetStatusColor(this UpsellStatus status)
    {
        return status switch
        {
            UpsellStatus.Active => "positive",
            UpsellStatus.Scheduled => "warning",
            UpsellStatus.Expired or UpsellStatus.Disabled => "danger",
            _ => "default"
        };
    }
}
