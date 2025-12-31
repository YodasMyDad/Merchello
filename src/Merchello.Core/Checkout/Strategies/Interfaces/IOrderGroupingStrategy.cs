using Merchello.Core.Checkout.Strategies.Models;

namespace Merchello.Core.Checkout.Strategies.Interfaces;

/// <summary>
/// Contract for order grouping strategy implementations.
/// Strategies determine how basket items are grouped into orders during checkout.
/// </summary>
/// <remarks>
/// The default implementation groups items by warehouse.
/// Custom implementations can group by vendor, delivery date, product category, etc.
/// </remarks>
public interface IOrderGroupingStrategy
{
    /// <summary>
    /// Strategy metadata for identification and display.
    /// </summary>
    OrderGroupingStrategyMetadata Metadata { get; }

    /// <summary>
    /// Groups basket items into order groups based on the strategy's logic.
    /// </summary>
    /// <param name="context">The grouping context containing basket, addresses, products, and warehouses.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result containing the order groups or validation errors.</returns>
    Task<OrderGroupingResult> GroupItemsAsync(
        OrderGroupingContext context,
        CancellationToken cancellationToken = default);
}

