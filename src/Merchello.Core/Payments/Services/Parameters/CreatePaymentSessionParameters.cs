namespace Merchello.Core.Payments.Services.Parameters;

/// <summary>
/// Parameters for creating a payment session
/// </summary>
public class CreatePaymentSessionParameters
{
    /// <summary>
    /// The invoice ID to pay
    /// </summary>
    public required Guid InvoiceId { get; init; }

    /// <summary>
    /// The payment provider alias to use (e.g., "stripe", "braintree")
    /// </summary>
    public required string ProviderAlias { get; init; }

    /// <summary>
    /// The payment method alias within the provider (e.g., "cards", "applepay").
    /// Optional - if not specified, uses the provider's default method.
    /// </summary>
    public string? MethodAlias { get; init; }

    /// <summary>
    /// URL to redirect to after successful payment
    /// </summary>
    public required string ReturnUrl { get; init; }

    /// <summary>
    /// URL to redirect to if payment is cancelled
    /// </summary>
    public required string CancelUrl { get; init; }
}
