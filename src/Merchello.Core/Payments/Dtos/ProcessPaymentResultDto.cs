namespace Merchello.Core.Payments.Dtos;

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

    /// <summary>
    /// Correlation ID for error tracking and support troubleshooting.
    /// Populated when Success is false.
    /// </summary>
    public string? CorrelationId { get; set; }
}
