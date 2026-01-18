using System.Text.Json.Serialization;
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
    [JsonPropertyName("providerAlias")]
    public required string ProviderAlias { get; set; }

    /// <summary>
    /// The method alias within the provider (e.g., "cards", "applepay", "paypal").
    /// </summary>
    [JsonPropertyName("methodAlias")]
    public required string MethodAlias { get; set; }

    /// <summary>
    /// Display name shown to customers.
    /// </summary>
    [JsonPropertyName("displayName")]
    public required string DisplayName { get; set; }

    /// <summary>
    /// Icon identifier for the payment method in admin UI (e.g., "icon-credit-card").
    /// </summary>
    [JsonPropertyName("icon")]
    public string? Icon { get; set; }

    /// <summary>
    /// Icon HTML/SVG markup for the payment method in admin UI.
    /// </summary>
    [JsonPropertyName("iconHtml")]
    public string? IconHtml { get; set; }

    /// <summary>
    /// Icon HTML/SVG markup for the payment method in customer checkout.
    /// Separate from Icon/IconHtml which are used in admin UI.
    /// </summary>
    [JsonPropertyName("checkoutIconHtml")]
    public string? CheckoutIconHtml { get; set; }

    /// <summary>
    /// Custom icon media key (Umbraco media GUID) for checkout display.
    /// If set, this overrides the provider's default icon.
    /// </summary>
    [JsonPropertyName("iconMediaKey")]
    public Guid? IconMediaKey { get; set; }

    /// <summary>
    /// Resolved URL for the custom icon media.
    /// Populated by the API layer when IconMediaKey is set.
    /// </summary>
    [JsonPropertyName("iconMediaUrl")]
    public string? IconMediaUrl { get; set; }

    /// <summary>
    /// Custom styling for the payment method container in checkout.
    /// </summary>
    [JsonPropertyName("checkoutStyle")]
    public PaymentMethodCheckoutStyleDto? CheckoutStyle { get; set; }

    /// <summary>
    /// Description of the payment method.
    /// </summary>
    [JsonPropertyName("description")]
    public string? Description { get; set; }

    /// <summary>
    /// How this method integrates with the checkout UI.
    /// </summary>
    [JsonPropertyName("integrationType")]
    public PaymentIntegrationType IntegrationType { get; set; }

    /// <summary>
    /// Whether this is an express checkout method (Apple Pay, Google Pay, PayPal).
    /// Express methods appear at the start of checkout and collect customer data from the provider.
    /// </summary>
    [JsonPropertyName("isExpressCheckout")]
    public bool IsExpressCheckout { get; set; }

    /// <summary>
    /// Sort order for display in checkout.
    /// </summary>
    [JsonPropertyName("sortOrder")]
    public int SortOrder { get; set; }

    /// <summary>
    /// Whether this payment method should be shown in customer checkout.
    /// </summary>
    [JsonPropertyName("showInCheckout")]
    public bool ShowInCheckout { get; set; }

    /// <summary>
    /// The type/category of this payment method (e.g., "cards", "apple-pay", "google-pay").
    /// Used for deduplication when multiple providers offer the same method type.
    /// </summary>
    [JsonPropertyName("methodType")]
    public string? MethodType { get; set; }
}
