namespace Merchello.Core.Protocols.Models;

/// <summary>
/// Protocol-agnostic representation of an applied discount.
/// </summary>
public class CheckoutDiscountState
{
    public required string DiscountId { get; init; }
    public string? Code { get; init; }
    public required string Name { get; init; }

    /// <summary>
    /// Type: percentage, fixed_amount, free_shipping, buy_x_get_y
    /// </summary>
    public required string Type { get; init; }

    /// <summary>
    /// Amount in minor units (cents).
    /// </summary>
    public required long Amount { get; init; }

    public bool IsAutomatic { get; init; }

    /// <summary>
    /// Allocation method: each, across
    /// </summary>
    public string? Method { get; init; }

    public int? Priority { get; init; }
    public IReadOnlyList<DiscountAllocation>? Allocation { get; init; }
}

/// <summary>
/// How a discount is allocated across targets.
/// </summary>
public class DiscountAllocation
{
    /// <summary>
    /// JSONPath target (e.g., $.line_items[0])
    /// </summary>
    public required string Target { get; init; }

    public required long Amount { get; init; }
}
