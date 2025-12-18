using Merchello.Core.Accounting.Models;
using Merchello.Core.Discounts.Models;

namespace Merchello.Core.Discounts.Services.Parameters;

/// <summary>
/// Parameters for creating Buy X Get Y configuration.
/// </summary>
public class CreateBuyXGetYParameters
{
    // =====================================================
    // Customer Buys (Trigger)
    // =====================================================

    /// <summary>
    /// The trigger type - MinimumQuantity or MinimumPurchaseAmount.
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
    /// IDs for the "Buy" products/categories.
    /// </summary>
    public List<Guid>? BuyTargetIds { get; set; }

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
    /// IDs for the "Get" products/categories. Can differ from BuyTargetIds.
    /// </summary>
    public List<Guid>? GetTargetIds { get; set; }

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
    /// How to select which items to discount - Cheapest or MostExpensive.
    /// </summary>
    public BuyXGetYSelectionMethod SelectionMethod { get; set; }
}
