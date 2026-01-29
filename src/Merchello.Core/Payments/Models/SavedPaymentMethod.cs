using Merchello.Core.Customers.Models;
using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Payments.Models;

/// <summary>
/// Represents a saved payment method (vaulted at a payment provider).
/// The actual payment credentials are stored at the provider - this entity only stores
/// references (tokens) and display metadata (last 4 digits, expiry, brand).
/// </summary>
public class SavedPaymentMethod
{
    /// <summary>
    /// Unique identifier for this saved payment method.
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    // =====================================================
    // Customer ownership
    // =====================================================

    /// <summary>
    /// The customer who owns this saved payment method.
    /// </summary>
    public Guid CustomerId { get; set; }

    /// <summary>
    /// Navigation property to the customer.
    /// </summary>
    public virtual Customer? Customer { get; set; }

    // =====================================================
    // Provider identifiers
    // =====================================================

    /// <summary>
    /// The payment provider alias (e.g., "stripe", "braintree", "paypal").
    /// </summary>
    public string ProviderAlias { get; set; } = string.Empty;

    /// <summary>
    /// The provider's payment method ID/token (e.g., pm_xxx for Stripe, vault token for Braintree).
    /// This is the reference used to charge this payment method.
    /// </summary>
    public string ProviderMethodId { get; set; } = string.Empty;

    /// <summary>
    /// The provider's customer ID (e.g., cus_xxx for Stripe).
    /// Required by some providers (Stripe, Braintree) to charge saved methods.
    /// </summary>
    public string? ProviderCustomerId { get; set; }

    // =====================================================
    // Display metadata (never sensitive data)
    // =====================================================

    /// <summary>
    /// The type of payment method (Card, PayPal, BankAccount, etc.).
    /// </summary>
    public SavedPaymentMethodType MethodType { get; set; } = SavedPaymentMethodType.Card;

    /// <summary>
    /// The card brand (e.g., "visa", "mastercard", "amex").
    /// Only applicable for card payment methods.
    /// </summary>
    public string? CardBrand { get; set; }

    /// <summary>
    /// The last 4 digits of the card number or account number.
    /// </summary>
    public string? Last4 { get; set; }

    /// <summary>
    /// The card expiry month (1-12).
    /// Only applicable for card payment methods.
    /// </summary>
    public int? ExpiryMonth { get; set; }

    /// <summary>
    /// The card expiry year (4 digits, e.g., 2026).
    /// Only applicable for card payment methods.
    /// </summary>
    public int? ExpiryYear { get; set; }

    /// <summary>
    /// The billing name associated with this payment method.
    /// </summary>
    public string? BillingName { get; set; }

    /// <summary>
    /// The billing email associated with this payment method (primarily for PayPal).
    /// </summary>
    public string? BillingEmail { get; set; }

    /// <summary>
    /// Human-readable label for display (e.g., "Visa ending in 4242").
    /// </summary>
    public string DisplayLabel { get; set; } = string.Empty;

    // =====================================================
    // State
    // =====================================================

    /// <summary>
    /// Whether this is the customer's default payment method.
    /// </summary>
    public bool IsDefault { get; set; }

    /// <summary>
    /// Whether this payment method has been verified (e.g., 3DS verified, micro-deposits confirmed).
    /// </summary>
    public bool IsVerified { get; set; }

    // =====================================================
    // Consent tracking (for compliance)
    // =====================================================

    /// <summary>
    /// The date/time when the customer consented to save this payment method (UTC).
    /// Required for compliance with payment regulations.
    /// </summary>
    public DateTime? ConsentDateUtc { get; set; }

    /// <summary>
    /// The IP address from which consent was given.
    /// </summary>
    public string? ConsentIpAddress { get; set; }

    // =====================================================
    // Timestamps
    // =====================================================

    /// <summary>
    /// Date this record was created (UTC).
    /// </summary>
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Date this record was last updated (UTC).
    /// </summary>
    public DateTime DateUpdated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Date this payment method was last used for a charge (UTC).
    /// </summary>
    public DateTime? DateLastUsed { get; set; }

    // =====================================================
    // Provider-specific data
    // =====================================================

    /// <summary>
    /// Additional provider-specific data (e.g., card fingerprint, funding type).
    /// Stored as JSON in the database.
    /// </summary>
    public Dictionary<string, object> ExtendedData { get; set; } = [];
}
