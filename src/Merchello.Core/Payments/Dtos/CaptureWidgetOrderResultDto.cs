namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Response from capturing a widget order.
/// Used by providers implementing the create-order/capture pattern.
/// </summary>
public class CaptureWidgetOrderResultDto
{
    /// <summary>
    /// Whether the payment was captured successfully.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// The invoice ID created for this order.
    /// </summary>
    public Guid? InvoiceId { get; set; }

    /// <summary>
    /// The payment ID if payment was recorded.
    /// </summary>
    public Guid? PaymentId { get; set; }

    /// <summary>
    /// The transaction ID from the provider.
    /// </summary>
    public string? TransactionId { get; set; }

    /// <summary>
    /// URL to redirect the customer to (confirmation page).
    /// </summary>
    public string? RedirectUrl { get; set; }

    /// <summary>
    /// Error message if capture failed.
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Correlation ID for error tracking and support troubleshooting.
    /// Populated when Success is false.
    /// </summary>
    public string? CorrelationId { get; set; }
}
