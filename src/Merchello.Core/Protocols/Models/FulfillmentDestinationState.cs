namespace Merchello.Core.Protocols.Models;

/// <summary>
/// A fulfillment destination.
/// </summary>
public class FulfillmentDestinationState
{
    /// <summary>
    /// Type: postal_address, retail_location
    /// </summary>
    public required string Type { get; init; }

    public CheckoutAddressState? Address { get; init; }
    public RetailLocationState? RetailLocation { get; init; }
}
