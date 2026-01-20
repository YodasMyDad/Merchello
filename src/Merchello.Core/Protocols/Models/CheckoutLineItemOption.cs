namespace Merchello.Core.Protocols.Models;

/// <summary>
/// A selected product option on a line item.
/// </summary>
public class CheckoutLineItemOption
{
    public required string Name { get; init; }
    public required string Value { get; init; }
}
