namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Request to capture an approved PayPal order.
/// Called after the user approves payment in the PayPal popup.
/// </summary>
public class CapturePayPalOrderDto
{
    /// <summary>
    /// The PayPal order ID that was approved.
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
}
