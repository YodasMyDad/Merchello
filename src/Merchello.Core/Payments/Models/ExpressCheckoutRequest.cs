namespace Merchello.Core.Payments.Models;

/// <summary>
/// Request to process an express checkout payment.
/// Express checkout flows (Apple Pay, Google Pay, PayPal) return both payment authorization
/// and customer data in a single step, allowing the order to be created immediately.
/// </summary>
public class ExpressCheckoutRequest
{
    /// <summary>
    /// The basket ID for this checkout.
    /// </summary>
    public Guid BasketId { get; set; }

    /// <summary>
    /// The payment method alias (e.g., "applepay", "googlepay", "paypal").
    /// </summary>
    public required string MethodAlias { get; set; }

    /// <summary>
    /// Payment token or authorization from the provider SDK.
    /// </summary>
    public required string PaymentToken { get; set; }

    /// <summary>
    /// The total payment amount.
    /// </summary>
    public decimal Amount { get; set; }

    /// <summary>
    /// ISO 4217 currency code (e.g., "USD", "GBP", "EUR").
    /// </summary>
    public required string Currency { get; set; }

    /// <summary>
    /// Customer data returned by the express checkout provider.
    /// </summary>
    public required ExpressCheckoutCustomerData CustomerData { get; set; }

    /// <summary>
    /// Optional provider-specific data from the SDK callback.
    /// </summary>
    public Dictionary<string, string>? ProviderData { get; set; }
}
