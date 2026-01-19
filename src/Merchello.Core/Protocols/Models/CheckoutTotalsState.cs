namespace Merchello.Core.Protocols.Models;

/// <summary>
/// Protocol-agnostic representation of checkout totals.
/// All amounts in minor units (cents).
/// </summary>
public class CheckoutTotalsState
{
    public required long Subtotal { get; init; }
    public long ItemsDiscount { get; init; }
    public long Discount { get; init; }
    public long Fulfillment { get; init; }
    public long Tax { get; init; }
    public required long Total { get; init; }
    public required string Currency { get; init; }

    public IReadOnlyList<CheckoutTotalBreakdown>? Breakdown { get; init; }
}

/// <summary>
/// Individual line in the totals breakdown.
/// </summary>
public class CheckoutTotalBreakdown
{
    public required string Label { get; init; }
    public required long Amount { get; init; }

    /// <summary>
    /// Type: items_discount, subtotal, discount, fulfillment, tax, fee, total
    /// </summary>
    public required string Type { get; init; }
}
