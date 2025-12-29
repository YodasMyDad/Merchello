using Merchello.Core.Payments.Models;

namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Payment method available for checkout.
/// Represents a specific payment method from a provider (e.g., Stripe Cards, Stripe Apple Pay).
/// </summary>
public class PaymentMethodDto
{
    /// <summary>
    /// The provider alias (e.g., "stripe", "braintree").
    /// </summary>
    public required string ProviderAlias { get; set; }

    /// <summary>
    /// The method alias within the provider (e.g., "cards", "applepay", "paypal").
    /// </summary>
    public required string MethodAlias { get; set; }

    /// <summary>
    /// Display name shown to customers.
    /// </summary>
    public required string DisplayName { get; set; }

    /// <summary>
    /// Icon identifier or URL (legacy).
    /// </summary>
    public string? Icon { get; set; }

    /// <summary>
    /// Icon HTML/SVG markup for the payment method.
    /// When provided, this is used instead of Icon for rendering.
    /// </summary>
    public string? IconHtml { get; set; }

    /// <summary>
    /// Description of the payment method.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// How this method integrates with the checkout UI.
    /// </summary>
    public PaymentIntegrationType IntegrationType { get; set; }

    /// <summary>
    /// Whether this is an express checkout method (Apple Pay, Google Pay, PayPal).
    /// Express methods appear at the start of checkout and collect customer data from the provider.
    /// </summary>
    public bool IsExpressCheckout { get; set; }

    /// <summary>
    /// Sort order for display in checkout.
    /// </summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// Whether this payment method should be shown in customer checkout.
    /// </summary>
    public bool ShowInCheckout { get; set; }

    /// <summary>
    /// The type/category of this payment method (e.g., Cards, ApplePay, GooglePay).
    /// Used for deduplication when multiple providers offer the same method type.
    /// </summary>
    public PaymentMethodType? MethodType { get; set; }
}
