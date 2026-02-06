using Merchello.Core.Accounting.Models;
using Merchello.Core.Discounts.Models;
using Merchello.Core.Shared.Services.Interfaces;

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

    /// <summary>
    /// Gets the display label for a discount category.
    /// </summary>
    public static string GetCategoryLabel(this DiscountCategory category)
    {
        return category switch
        {
            DiscountCategory.AmountOffProducts => "Products",
            DiscountCategory.AmountOffOrder => "Order",
            DiscountCategory.BuyXGetY => "Buy X Get Y",
            DiscountCategory.FreeShipping => "Free Shipping",
            _ => "Unknown"
        };
    }

    /// <summary>
    /// Gets the formatted display value for a discount (e.g., "10%", "$5.00", "Free").
    /// </summary>
    public static string GetFormattedValue(this DiscountValueType valueType, decimal value, ICurrencyService currencyService, string storeCurrencyCode)
    {
        return valueType switch
        {
            DiscountValueType.Percentage => $"{value}%",
            DiscountValueType.FixedAmount => currencyService.FormatAmount(value, storeCurrencyCode),
            DiscountValueType.Free => "Free",
            _ => value.ToString()
        };
    }
}
