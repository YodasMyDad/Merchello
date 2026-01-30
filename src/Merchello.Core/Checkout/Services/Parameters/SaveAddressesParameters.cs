using Merchello.Core.Checkout.Models;
using Merchello.Core.Locality.Dtos;

namespace Merchello.Core.Checkout.Services.Parameters;

/// <summary>
/// Parameters for saving billing and shipping addresses to the basket
/// </summary>
public class SaveAddressesParameters
{
    /// <summary>
    /// The basket to update
    /// </summary>
    public required Basket Basket { get; init; }

    /// <summary>
    /// The email address for the order
    /// Optional for partial saves (capture mode).
    /// </summary>
    public string? Email { get; init; }

    /// <summary>
    /// The billing address
    /// Optional for partial saves (capture mode).
    /// </summary>
    public AddressDto? BillingAddress { get; init; }

    /// <summary>
    /// The shipping address (null if same as billing)
    /// </summary>
    public AddressDto? ShippingAddress { get; init; }

    /// <summary>
    /// Whether shipping address is the same as billing
    /// </summary>
    public bool ShippingSameAsBilling { get; init; }

    /// <summary>
    /// Whether the customer accepts marketing communications.
    /// </summary>
    public bool AcceptsMarketing { get; init; }

    /// <summary>
    /// Optional password for member account creation.
    /// When provided, an Umbraco member will be created and linked to the customer.
    /// </summary>
    public string? Password { get; init; }

    /// <summary>
    /// When true, performs a partial save without recalculation (capture mode).
    /// </summary>
    public bool IsPartial { get; init; }
}
