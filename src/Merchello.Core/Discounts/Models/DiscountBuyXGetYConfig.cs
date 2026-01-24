using System.Text.Json;
using Merchello.Core.Accounting.Models;

namespace Merchello.Core.Discounts.Models;

/// <summary>
/// Configuration for Buy X Get Y (BOGO) discounts.
/// </summary>
public class DiscountBuyXGetYConfig
{
    // =====================================================
    // Customer Buys (Trigger)
    // =====================================================

    /// <summary>
    /// The trigger type (MinimumQuantity or MinimumPurchaseAmount).
    /// </summary>
    public BuyXTriggerType BuyTriggerType { get; set; }

    /// <summary>
    /// The trigger value (quantity or amount based on BuyTriggerType).
    /// </summary>
    public decimal BuyTriggerValue { get; set; }

    /// <summary>
    /// What type of products satisfy the "Buy" condition.
    /// </summary>
    public DiscountTargetType BuyTargetType { get; set; }

    /// <summary>
    /// JSON array of IDs for the "Buy" products/categories.
    /// </summary>
    public string? BuyTargetIds { get; set; }

    // =====================================================
    // Customer Gets (Reward)
    // =====================================================

    /// <summary>
    /// How many items the customer gets at a discount per trigger.
    /// </summary>
    public int GetQuantity { get; set; }

    /// <summary>
    /// What type of products can be discounted.
    /// </summary>
    public DiscountTargetType GetTargetType { get; set; }

    /// <summary>
    /// JSON array of IDs for the "Get" products/categories.
    /// Can differ from BuyTargetIds.
    /// </summary>
    public string? GetTargetIds { get; set; }

    /// <summary>
    /// The type of discount applied to "Get" items.
    /// </summary>
    public DiscountValueType GetValueType { get; set; }

    /// <summary>
    /// The discount value for "Get" items.
    /// </summary>
    public decimal GetValue { get; set; }

    // =====================================================
    // Options
    // =====================================================

    /// <summary>
    /// How to select which items to discount (Cheapest or MostExpensive).
    /// </summary>
    public BuyXGetYSelectionMethod SelectionMethod { get; set; }

    /// <summary>
    /// Gets the Buy target IDs as a list of Guids.
    /// </summary>
    public List<Guid> GetBuyTargetIdsList()
    {
        if (string.IsNullOrEmpty(BuyTargetIds))
            return [];

        try
        {
            return JsonSerializer.Deserialize<List<Guid>>(BuyTargetIds) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    /// <summary>
    /// Gets the Get target IDs as a list of Guids.
    /// </summary>
    public List<Guid> GetGetTargetIdsList()
    {
        if (string.IsNullOrEmpty(GetTargetIds))
            return [];

        try
        {
            return JsonSerializer.Deserialize<List<Guid>>(GetTargetIds) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }
}
