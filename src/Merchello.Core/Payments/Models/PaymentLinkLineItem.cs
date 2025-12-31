namespace Merchello.Core.Payments.Models;

/// <summary>
/// Line item for payment link display.
/// </summary>
public class PaymentLinkLineItem
{
    /// <summary>
    /// Name of the item.
    /// </summary>
    public required string Name { get; init; }

    /// <summary>
    /// Optional description of the item.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Unit price of the item.
    /// </summary>
    public required decimal Amount { get; init; }

    /// <summary>
    /// Quantity of items. Defaults to 1.
    /// </summary>
    public int Quantity { get; init; } = 1;
}
