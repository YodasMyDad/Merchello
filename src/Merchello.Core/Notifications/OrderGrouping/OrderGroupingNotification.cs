using Merchello.Core.Checkout.Strategies.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.OrderGrouping;

/// <summary>
/// Published after order grouping has completed. Handlers can observe the result
/// but should not modify it (use OrderGroupingModifyingNotification for modifications).
/// </summary>
public class OrderGroupingNotification : MerchelloNotification
{
    public OrderGroupingNotification(
        OrderGroupingContext context,
        OrderGroupingResult result,
        string strategyKey)
    {
        Context = context;
        Result = result;
        StrategyKey = strategyKey;
    }

    /// <summary>
    /// Gets the grouping context that was used.
    /// </summary>
    public OrderGroupingContext Context { get; }

    /// <summary>
    /// Gets the grouping result.
    /// </summary>
    public OrderGroupingResult Result { get; }

    /// <summary>
    /// Gets the key of the strategy that performed the grouping.
    /// </summary>
    public string StrategyKey { get; }
}

