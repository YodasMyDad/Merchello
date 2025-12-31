namespace Merchello.Core.Payments.Models;

/// <summary>
/// Information about a payment link for an invoice.
/// Used for API responses and UI display.
/// </summary>
public class PaymentLinkInfo
{
    /// <summary>
    /// The shareable payment URL.
    /// </summary>
    public string? PaymentUrl { get; init; }

    /// <summary>
    /// Provider's internal link ID (for deactivation).
    /// </summary>
    public string? ProviderLinkId { get; init; }

    /// <summary>
    /// The payment provider alias (e.g., "stripe", "paypal").
    /// </summary>
    public string? ProviderAlias { get; init; }

    /// <summary>
    /// Display name of the provider.
    /// </summary>
    public string? ProviderDisplayName { get; init; }

    /// <summary>
    /// When the payment link was created.
    /// </summary>
    public DateTime? CreatedAt { get; init; }

    /// <summary>
    /// Username of the staff member who created the link.
    /// </summary>
    public string? CreatedBy { get; init; }

    /// <summary>
    /// Whether the invoice has been paid.
    /// Derived from invoice payment status.
    /// </summary>
    public bool IsPaid { get; init; }

    /// <summary>
    /// Whether there is an active payment link.
    /// </summary>
    public bool HasActiveLink => !string.IsNullOrEmpty(PaymentUrl) && !IsPaid;
}
