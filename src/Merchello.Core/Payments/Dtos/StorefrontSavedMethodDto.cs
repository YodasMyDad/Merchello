using Merchello.Core.Payments.Models;

namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Saved payment method for storefront display (customer-facing).
/// Contains only information safe to show to customers.
/// </summary>
public class StorefrontSavedMethodDto
{
    /// <summary>
    /// Unique identifier.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// The payment provider alias.
    /// </summary>
    public string ProviderAlias { get; set; } = string.Empty;

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
    /// Formatted expiry (e.g., "12/26").
    /// </summary>
    public string? ExpiryFormatted { get; set; }

    /// <summary>
    /// Whether the card is expired.
    /// </summary>
    public bool IsExpired { get; set; }

    /// <summary>
    /// Human-readable display label.
    /// </summary>
    public string DisplayLabel { get; set; } = string.Empty;

    /// <summary>
    /// Whether this is the customer's default payment method.
    /// </summary>
    public bool IsDefault { get; set; }

    /// <summary>
    /// Icon HTML (SVG) for the payment method.
    /// </summary>
    public string? IconHtml { get; set; }
}
