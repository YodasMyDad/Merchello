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

/// <summary>
/// Result of processing a payment
/// </summary>
public class ProcessPaymentResultDto
{
    /// <summary>
    /// Whether the payment was processed successfully
    /// </summary>
    public required bool Success { get; set; }

    /// <summary>
    /// The invoice ID
    /// </summary>
    public Guid InvoiceId { get; set; }

    /// <summary>
    /// The payment ID if successful
    /// </summary>
    public Guid? PaymentId { get; set; }

    /// <summary>
    /// Transaction ID from the payment provider
    /// </summary>
    public string? TransactionId { get; set; }

    /// <summary>
    /// Error message if the payment failed
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// URL to redirect to after successful payment (e.g., confirmation page)
    /// </summary>
    public string? RedirectUrl { get; set; }
}
