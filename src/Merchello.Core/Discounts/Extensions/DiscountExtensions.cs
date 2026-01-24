using Merchello.Core.Discounts.Models;

namespace Merchello.Core.Discounts.Extensions;

public static class DiscountExtensions
{
    /// <summary>
    /// Gets the display label for a discount status.
    /// </summary>
    public static string GetStatusLabel(this DiscountStatus status)
    {
        return status switch
        {
            DiscountStatus.Draft => "Draft",
            DiscountStatus.Active => "Active",
            DiscountStatus.Scheduled => "Scheduled",
            DiscountStatus.Expired => "Expired",
            DiscountStatus.Disabled => "Disabled",
            _ => "Unknown"
        };
    }

    /// <summary>
    /// Gets the color/CSS class for a discount status badge.
    /// </summary>
    public static string GetStatusColor(this DiscountStatus status)
    {
        return status switch
        {
            DiscountStatus.Active => "positive",
            DiscountStatus.Scheduled => "warning",
            DiscountStatus.Expired or DiscountStatus.Disabled => "danger",
            _ => "default"
        };
    }
}
