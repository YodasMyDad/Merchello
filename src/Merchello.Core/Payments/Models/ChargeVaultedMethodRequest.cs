namespace Merchello.Core.Payments.Models;

/// <summary>
/// Request to charge a vaulted payment method (off-session, no CVV required).
/// </summary>
public class ChargeVaultedMethodRequest
{
    /// <summary>
    /// The invoice ID this charge is for.
    /// </summary>
    public required Guid InvoiceId { get; init; }

    /// <summary>
    /// The Merchello customer ID.
    /// </summary>
    public required Guid CustomerId { get; init; }

    /// <summary>
    /// The provider's payment method ID/token.
    /// </summary>
    public required string ProviderMethodId { get; init; }

    /// <summary>
    /// The provider's customer ID (required by some providers).
    /// </summary>
    public string? ProviderCustomerId { get; init; }

    /// <summary>
    /// The amount to charge.
    /// </summary>
    public required decimal Amount { get; init; }

    /// <summary>
    /// The currency code (e.g., "USD", "GBP").
    /// </summary>
    public required string CurrencyCode { get; init; }

    /// <summary>
    /// Description for the charge (shown on provider dashboard/receipts).
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Idempotency key to prevent duplicate charges.
    /// </summary>
    public string? IdempotencyKey { get; init; }

    /// <summary>
    /// Additional metadata to pass to the provider.
    /// </summary>
    public Dictionary<string, string>? Metadata { get; init; }
}
