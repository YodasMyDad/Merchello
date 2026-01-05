namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Customer data returned from express checkout.
/// </summary>
public class ExpressCheckoutCustomerDataDto
{
    /// <summary>
    /// Customer's email address.
    /// </summary>
    public required string Email { get; set; }

    /// <summary>
    /// Customer's phone number (optional).
    /// </summary>
    public string? Phone { get; set; }

    /// <summary>
    /// Customer's full name.
    /// </summary>
    public string? FullName { get; set; }

    /// <summary>
    /// Shipping address from express checkout.
    /// May be null if the provider didn't return an address (e.g., PayPal sandbox accounts).
    /// </summary>
    public ExpressCheckoutAddressDto? ShippingAddress { get; set; }

    /// <summary>
    /// Billing address. If null, billing is same as shipping.
    /// </summary>
    public ExpressCheckoutAddressDto? BillingAddress { get; set; }
}
