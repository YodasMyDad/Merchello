namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Request to process a payment after client-side tokenization (e.g., Braintree Drop-in, Stripe Elements)
/// </summary>
public class ProcessPaymentDto
{
    /// <summary>
    /// The invoice ID to process payment for
    /// </summary>
    public required Guid InvoiceId { get; set; }

    /// <summary>
    /// The payment provider alias (e.g., "braintree", "stripe")
    /// </summary>
    public required string ProviderAlias { get; set; }

    /// <summary>
    /// The payment method alias within the provider (e.g., "cards", "applepay")
    /// </summary>
    public string? MethodAlias { get; set; }

    /// <summary>
    /// Payment method token/nonce from the client-side SDK (e.g., Braintree nonce)
    /// </summary>
    public required string PaymentMethodToken { get; set; }

    /// <summary>
    /// Additional form data from the client (e.g., device data for fraud protection)
    /// </summary>
    public Dictionary<string, string>? FormData { get; set; }
}
