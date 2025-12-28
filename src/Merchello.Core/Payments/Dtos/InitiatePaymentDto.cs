namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Request to initiate a payment
/// </summary>
public class InitiatePaymentDto
{
    /// <summary>
    /// The payment provider alias to use (e.g., "stripe", "braintree")
    /// </summary>
    public required string ProviderAlias { get; set; }

    /// <summary>
    /// The payment method alias within the provider (e.g., "cards", "applepay", "paypal").
    /// Optional - if not specified, uses the provider's default method.
    /// </summary>
    public string? MethodAlias { get; set; }

    /// <summary>
    /// URL to redirect to after successful payment
    /// </summary>
    public required string ReturnUrl { get; set; }

    /// <summary>
    /// URL to redirect to if payment is cancelled
    /// </summary>
    public required string CancelUrl { get; set; }
}
