using Merchello.Core.Payments.Models;

namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Full details of a saved payment method for admin views.
/// </summary>
public class SavedPaymentMethodDetailDto
{
    /// <summary>
    /// Unique identifier.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// The customer who owns this saved payment method.
    /// </summary>
    public Guid CustomerId { get; set; }

    /// <summary>
    /// The payment provider alias.
    /// </summary>
    public string ProviderAlias { get; set; } = string.Empty;

    /// <summary>
    /// The payment provider display name.
    /// </summary>
    public string? ProviderDisplayName { get; set; }

    /// <summary>
    /// The type of payment method.
    /// </summary>
    public SavedPaymentMethodType MethodType { get; set; }

    /// <summary>
    /// The card brand (for cards).
    /// </summary>
    public string? CardBrand { get; set; }

    /// <summary>
    /// The last 4 digits.
    /// </summary>
    public string? Last4 { get; set; }

    /// <summary>
    /// The card expiry month (1-12).
    /// </summary>
    public int? ExpiryMonth { get; set; }

    /// <summary>
    /// The card expiry year (4 digits).
    /// </summary>
    public int? ExpiryYear { get; set; }

    /// <summary>
    /// Formatted expiry (e.g., "12/26").
    /// </summary>
    public string? ExpiryFormatted { get; set; }

    /// <summary>
    /// Whether the card is expired.
    /// </summary>
    public bool IsExpired { get; set; }

    /// <summary>
    /// The billing name.
    /// </summary>
    public string? BillingName { get; set; }

    /// <summary>
    /// The billing email (for PayPal).
    /// </summary>
    public string? BillingEmail { get; set; }

    /// <summary>
    /// Human-readable display label.
    /// </summary>
    public string DisplayLabel { get; set; } = string.Empty;

    /// <summary>
    /// Whether this is the customer's default payment method.
    /// </summary>
    public bool IsDefault { get; set; }

    /// <summary>
    /// Whether the payment method is verified.
    /// </summary>
    public bool IsVerified { get; set; }

    /// <summary>
    /// Date the consent was given (UTC).
    /// </summary>
    public DateTime? ConsentDateUtc { get; set; }

    /// <summary>
    /// IP address from which consent was given.
    /// </summary>
    public string? ConsentIpAddress { get; set; }

    /// <summary>
    /// Date this record was created (UTC).
    /// </summary>
    public DateTime DateCreated { get; set; }

    /// <summary>
    /// Date this record was last updated (UTC).
    /// </summary>
    public DateTime DateUpdated { get; set; }

    /// <summary>
    /// Date this payment method was last used (UTC).
    /// </summary>
    public DateTime? DateLastUsed { get; set; }
}
