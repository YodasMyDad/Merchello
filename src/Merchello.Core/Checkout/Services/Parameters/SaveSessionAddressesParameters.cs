using Merchello.Core.Locality.Models;

namespace Merchello.Core.Checkout.Services.Parameters;

/// <summary>
/// Parameters for saving billing and shipping addresses to the checkout session.
/// </summary>
public class SaveSessionAddressesParameters
{
    /// <summary>
    /// The basket ID.
    /// </summary>
    public required Guid BasketId { get; init; }

    /// <summary>
    /// The billing address.
    /// </summary>
    public required Address Billing { get; init; }

    /// <summary>
    /// The shipping address (null if same as billing).
    /// </summary>
    public Address? Shipping { get; init; }

    /// <summary>
    /// Whether shipping address is the same as billing.
    /// </summary>
    public bool SameAsBilling { get; init; }

    /// <summary>
    /// Whether the customer accepts marketing communications.
    /// </summary>
    public bool AcceptsMarketing { get; init; }
}
