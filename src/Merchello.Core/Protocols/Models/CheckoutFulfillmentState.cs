namespace Merchello.Core.Protocols.Models;

/// <summary>
/// Protocol-agnostic representation of fulfillment options.
/// </summary>
public class CheckoutFulfillmentState
{
    public required IReadOnlyList<FulfillmentMethodState> Methods { get; init; }
}
