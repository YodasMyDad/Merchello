using Merchello.Core.Checkout.Strategies.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.OrderGrouping;

/// <summary>
/// Published before the order grouping result is returned. Handlers can modify
/// the result (add/remove/modify groups) or cancel the operation.
/// </summary>
public class OrderGroupingModifyingNotification : MerchelloCancelableNotification<OrderGroupingResult>
{
    public OrderGroupingModifyingNotification(
        OrderGroupingContext context,
        OrderGroupingResult result,
        string strategyKey) : base(result)
    {
        Context = context;
        StrategyKey = strategyKey;
    }

    /// <summary>
    /// Gets the grouping context.
    /// </summary>
    public OrderGroupingContext Context { get; }

    /// <summary>
    /// Gets the grouping result. Handlers can modify this result.
    /// </summary>
    public OrderGroupingResult Result => Entity;

    /// <summary>
    /// Gets the key of the strategy that performed the grouping.
    /// </summary>
    public string StrategyKey { get; }
}

