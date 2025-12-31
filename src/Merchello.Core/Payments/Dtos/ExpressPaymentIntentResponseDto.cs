namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Response from creating a PaymentIntent for express checkout.
/// </summary>
public class ExpressPaymentIntentResponseDto
{
    /// <summary>
    /// Whether the PaymentIntent was created successfully.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Error message if creation failed.
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// The client secret for confirming the payment.
    /// </summary>
    public string? ClientSecret { get; set; }

    /// <summary>
    /// The PaymentIntent ID for tracking.
    /// </summary>
    public string? PaymentIntentId { get; set; }

    /// <summary>
    /// Correlation ID for error tracking and support troubleshooting.
    /// Populated when Success is false.
    /// </summary>
    public string? CorrelationId { get; set; }
}
