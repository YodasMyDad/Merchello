namespace Merchello.Core.Protocols.Models;

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
