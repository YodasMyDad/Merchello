namespace Merchello.Core.Protocols.Models;

/// <summary>
/// A retail location for pickup.
/// </summary>
public class RetailLocationState
{
    public required string LocationId { get; init; }
    public required string Name { get; init; }
    public CheckoutAddressState? Address { get; init; }
}
