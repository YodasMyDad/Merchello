namespace Merchello.Core.Protocols.Models;

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
