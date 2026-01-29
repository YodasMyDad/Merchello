namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Request to process a payment using a saved payment method.
/// </summary>
public class ProcessSavedPaymentMethodDto
{
    /// <summary>
    /// The invoice ID to process payment for.
    /// </summary>
    public required Guid InvoiceId { get; set; }

    /// <summary>
    /// The saved payment method ID to use.
    /// </summary>
    public required Guid SavedPaymentMethodId { get; set; }

    /// <summary>
    /// Optional idempotency key to prevent duplicate charges.
    /// </summary>
    public string? IdempotencyKey { get; set; }
}
