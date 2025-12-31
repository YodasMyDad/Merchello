namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Response from processing an express checkout payment.
/// </summary>
public class ExpressCheckoutResponseDto
{
    /// <summary>
    /// Whether the payment was processed successfully.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Error message if the payment failed.
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Error code from the provider (if any).
    /// </summary>
    public string? ErrorCode { get; set; }

    /// <summary>
    /// The invoice ID created for this order.
    /// </summary>
    public Guid? InvoiceId { get; set; }

    /// <summary>
    /// The payment ID if payment was recorded.
    /// </summary>
    public Guid? PaymentId { get; set; }

    /// <summary>
    /// The transaction ID from the payment provider.
    /// </summary>
    public string? TransactionId { get; set; }

    /// <summary>
    /// URL to redirect the customer to (confirmation page).
    /// </summary>
    public string? RedirectUrl { get; set; }

    /// <summary>
    /// Payment status (completed, pending, failed).
    /// </summary>
    public string? Status { get; set; }

    /// <summary>
    /// Correlation ID for error tracking and support troubleshooting.
    /// Populated when Success is false.
    /// </summary>
    public string? CorrelationId { get; set; }
}
