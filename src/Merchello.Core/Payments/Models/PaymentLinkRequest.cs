namespace Merchello.Core.Payments.Models;

/// <summary>
/// Request to create a payment link for an invoice.
/// Sent to the payment provider to generate a shareable URL.
/// </summary>
public class PaymentLinkRequest
{
    /// <summary>
    /// The invoice ID this payment link is for.
    /// </summary>
    public required Guid InvoiceId { get; init; }

    /// <summary>
    /// The amount to charge.
    /// </summary>
    public required decimal Amount { get; init; }

    /// <summary>
    /// Currency code (e.g., "GBP", "USD").
    /// </summary>
    public required string Currency { get; init; }

    /// <summary>
    /// Customer email for receipt/notification purposes.
    /// </summary>
    public string? CustomerEmail { get; init; }

    /// <summary>
    /// Customer name for display on payment page.
    /// </summary>
    public string? CustomerName { get; init; }

    /// <summary>
    /// Description/memo for the payment.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Optional line items to display on the payment page.
    /// </summary>
    public List<PaymentLinkLineItem>? LineItems { get; init; }

    /// <summary>
    /// Additional metadata to attach to the payment link.
    /// </summary>
    public Dictionary<string, string>? Metadata { get; init; }
}
