namespace Merchello.Core.Payments.Services.Parameters;

/// <summary>
/// Parameters for charging a saved payment method.
/// </summary>
public class ChargeSavedMethodParameters
{
    /// <summary>
    /// The invoice ID this charge is for.
    /// </summary>
    public required Guid InvoiceId { get; init; }

    /// <summary>
    /// The saved payment method ID.
    /// </summary>
    public required Guid SavedPaymentMethodId { get; init; }

    /// <summary>
    /// The amount to charge. If null, uses the invoice balance due.
    /// </summary>
    public decimal? Amount { get; init; }

    /// <summary>
    /// Description for the charge.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Idempotency key to prevent duplicate charges.
    /// </summary>
    public string? IdempotencyKey { get; init; }
}
