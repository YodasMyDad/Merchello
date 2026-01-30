namespace Merchello.Core.Checkout.Dtos;

using Merchello.Core.Locality.Dtos;

/// <summary>
/// Request to save billing and shipping addresses during checkout.
/// </summary>
public class SaveAddressesRequestDto
{
    /// <summary>
    /// Customer email address.
    /// Optional for partial saves (capture mode).
    /// </summary>
    public string? Email { get; set; }

    /// <summary>
    /// Billing address.
    /// Optional for partial saves (capture mode).
    /// </summary>
    public AddressDto? BillingAddress { get; set; }

    /// <summary>
    /// Shipping address. Null if same as billing.
    /// </summary>
    public AddressDto? ShippingAddress { get; set; }

    /// <summary>
    /// Whether shipping address is the same as billing address.
    /// </summary>
    public bool ShippingSameAsBilling { get; set; } = true;

    /// <summary>
    /// Whether the customer accepts marketing communications.
    /// </summary>
    public bool AcceptsMarketing { get; set; }

    /// <summary>
    /// When true, performs a partial save without recalculation (capture mode).
    /// </summary>
    public bool IsPartial { get; set; }

    /// <summary>
    /// Optional password for creating an Umbraco member account.
    /// When provided, a member account will be created and linked to the customer.
    /// </summary>
    public string? Password { get; set; }
}
