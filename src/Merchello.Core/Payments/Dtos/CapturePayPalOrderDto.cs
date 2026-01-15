namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Request to capture an approved widget order.
/// Called after the user approves payment in the provider's UI (e.g., PayPal popup, Klarna modal).
/// </summary>
public class CaptureWidgetOrderDto
{
    /// <summary>
    /// The provider-specific order ID that was approved.
    /// </summary>
    public required string OrderId { get; set; }

    /// <summary>
    /// The payment session ID from the payment session creation.
    /// </summary>
    public string? SessionId { get; set; }

    /// <summary>
    /// The invoice ID associated with this payment.
    /// Required for capturing the payment.
    /// </summary>
    public Guid? InvoiceId { get; set; }

    /// <summary>
    /// Optional method alias to identify the payment method used.
    /// Used for display purposes on confirmation page (e.g., "PayPal", "Credit/Debit Card").
    /// </summary>
    public string? MethodAlias { get; set; }
}

/// <summary>
/// Request to capture an approved PayPal order.
/// Called after the user approves payment in the PayPal popup.
/// </summary>
[Obsolete("Use CaptureWidgetOrderDto instead. This will be removed in a future version.")]
public class CapturePayPalOrderDto : CaptureWidgetOrderDto
{
}
