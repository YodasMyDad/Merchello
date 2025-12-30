using System.Collections.Generic;

namespace Merchello.Core.Payments.Models;

/// <summary>
/// Request model for initiating a payment.
/// </summary>
public class PaymentRequest
{
    /// <summary>
    /// The invoice ID this payment is for.
    /// </summary>
    public required Guid InvoiceId { get; init; }

    /// <summary>
    /// The payment method alias (e.g., "cards", "cards-elements", "applepay").
    /// Used by providers that support multiple methods to route to the correct flow.
    /// </summary>
    public string? MethodAlias { get; init; }

    /// <summary>
    /// The amount to charge.
    /// </summary>
    public required decimal Amount { get; init; }

    /// <summary>
    /// Currency code (e.g., "GBP", "USD", "EUR").
    /// </summary>
    public required string Currency { get; init; }

    /// <summary>
    /// URL to redirect to after successful payment.
    /// </summary>
    public required string ReturnUrl { get; init; }

    /// <summary>
    /// URL to redirect to if payment is cancelled.
    /// </summary>
    public required string CancelUrl { get; init; }

    /// <summary>
    /// Optional webhook URL for payment notifications.
    /// </summary>
    public string? WebhookUrl { get; init; }

    /// <summary>
    /// Customer email address (for receipts).
    /// </summary>
    public string? CustomerEmail { get; init; }

    /// <summary>
    /// Customer name.
    /// </summary>
    public string? CustomerName { get; init; }

    /// <summary>
    /// Description of the payment (shown on gateway).
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Additional metadata to pass to the payment provider.
    /// </summary>
    public Dictionary<string, string>? Metadata { get; init; }

    /// <summary>
    /// Indicates this is a test mode request (from backoffice testing).
    /// Providers should use this to generate appropriate test session IDs.
    /// </summary>
    public bool IsTestMode { get; init; }
}

