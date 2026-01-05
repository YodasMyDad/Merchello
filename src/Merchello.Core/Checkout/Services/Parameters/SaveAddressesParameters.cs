using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Checkout.Models;

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
    /// </summary>
    public required string Email { get; init; }

    /// <summary>
    /// The billing address
    /// </summary>
    public required CheckoutAddressDto BillingAddress { get; init; }

    /// <summary>
    /// The shipping address (null if same as billing)
    /// </summary>
    public CheckoutAddressDto? ShippingAddress { get; init; }

    /// <summary>
    /// Whether shipping address is the same as billing
    /// </summary>
    public bool ShippingSameAsBilling { get; init; }
}
