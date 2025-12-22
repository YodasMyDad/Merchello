namespace Merchello.Core.Payments.Models;

/// <summary>
/// Customer data returned from an express checkout provider (Apple Pay, Google Pay, PayPal).
/// This data is used to create the customer and populate addresses without requiring form input.
/// </summary>
public class ExpressCheckoutCustomerData
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
    /// Customer's full name as returned by the provider.
    /// </summary>
    public string? FullName { get; set; }

    /// <summary>
    /// Shipping address selected by the customer in the express checkout flow.
    /// </summary>
    public required ExpressCheckoutAddress ShippingAddress { get; set; }

    /// <summary>
    /// Billing address. If null, billing address is same as shipping address.
    /// </summary>
    public ExpressCheckoutAddress? BillingAddress { get; set; }
}
