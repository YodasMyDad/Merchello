namespace Merchello.Core.Payments.Models;

/// <summary>
/// Defines how a payment provider integrates with the checkout flow.
/// </summary>
public enum PaymentIntegrationType
{
    /// <summary>
    /// Customer is redirected to an external payment page.
    /// Examples: Stripe Checkout (hosted), PayPal standard.
    /// </summary>
    Redirect = 0,

    /// <summary>
    /// Payment fields are rendered as iframes on the checkout page.
    /// Card data never touches the merchant's server.
    /// Examples: Braintree Hosted Fields, Stripe Elements.
    /// </summary>
    HostedFields = 10,

    /// <summary>
    /// Provider's embedded UI component is loaded on the checkout page.
    /// Examples: Klarna widget, PayPal Buttons.
    /// </summary>
    Widget = 20,

    /// <summary>
    /// Custom form fields are rendered directly on the checkout page.
    /// Data is submitted directly to the merchant's server.
    /// Examples: Purchase Order, Manual Payment, Bank Transfer.
    /// </summary>
    DirectForm = 30
}
