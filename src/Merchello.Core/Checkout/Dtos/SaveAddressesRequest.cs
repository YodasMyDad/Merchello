namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// Request to save billing and shipping addresses during checkout.
/// </summary>
public class SaveAddressesRequest
{
    /// <summary>
    /// Customer email address.
    /// </summary>
    public required string Email { get; set; }

    /// <summary>
    /// Billing address.
    /// </summary>
    public required CheckoutAddressDto BillingAddress { get; set; }

    /// <summary>
    /// Shipping address. Null if same as billing.
    /// </summary>
    public CheckoutAddressDto? ShippingAddress { get; set; }

    /// <summary>
    /// Whether shipping address is the same as billing address.
    /// </summary>
    public bool ShippingSameAsBilling { get; set; } = true;
}
