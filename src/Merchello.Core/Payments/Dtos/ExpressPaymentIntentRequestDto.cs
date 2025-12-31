namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Request to create a PaymentIntent for express checkout.
/// </summary>
public class ExpressPaymentIntentRequestDto
{
    /// <summary>
    /// The payment provider alias (e.g., "stripe").
    /// </summary>
    public required string ProviderAlias { get; set; }

    /// <summary>
    /// The payment method alias (e.g., "applepay", "googlepay").
    /// </summary>
    public string? MethodAlias { get; set; }

    /// <summary>
    /// Optional amount override (otherwise uses basket total).
    /// </summary>
    public decimal? Amount { get; set; }

    /// <summary>
    /// Optional currency override (otherwise uses basket currency).
    /// </summary>
    public string? Currency { get; set; }
}
