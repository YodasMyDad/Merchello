namespace Merchello.Core.Payments.Models;

/// <summary>
/// Defines a payment method that a provider supports.
/// Each provider can offer multiple payment methods (e.g., Stripe offers Cards, Apple Pay, Google Pay).
/// </summary>
public class PaymentMethodDefinition
{
    /// <summary>
    /// Unique alias for this payment method within the provider (e.g., "cards", "paypal", "applepay").
    /// </summary>
    public required string Alias { get; init; }

    /// <summary>
    /// Display name shown to customers (e.g., "Credit/Debit Card", "Apple Pay").
    /// </summary>
    public required string DisplayName { get; init; }

    /// <summary>
    /// Icon identifier for the payment method in admin UI (e.g., "icon-credit-card").
    /// </summary>
    public string? Icon { get; init; }

    /// <summary>
    /// Icon HTML/SVG markup for the payment method in admin UI.
    /// When provided, this is used instead of Icon for rendering in backoffice.
    /// </summary>
    public string? IconHtml { get; init; }

    /// <summary>
    /// Icon HTML/SVG markup for the payment method in customer checkout.
    /// Separate from Icon/IconHtml which are used in admin UI.
    /// When provided, this is rendered next to the payment method selection in checkout.
    /// </summary>
    public string? CheckoutIconHtml { get; init; }

    /// <summary>
    /// Inline styles for the payment method container in checkout.
    /// Allows providers to customize appearance to match their brand.
    /// </summary>
    public PaymentMethodCheckoutStyle? CheckoutStyle { get; init; }

    /// <summary>
    /// Description of the payment method shown to customers.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// How this payment method integrates with the checkout UI.
    /// </summary>
    public required PaymentIntegrationType IntegrationType { get; init; }

    /// <summary>
    /// Whether this is an express checkout method (Apple Pay, Google Pay, PayPal).
    /// Express checkout methods appear at the start of checkout and collect customer data from the provider.
    /// </summary>
    public bool IsExpressCheckout { get; init; }

    /// <summary>
    /// Default sort order when method settings are first created.
    /// Lower numbers appear first. Express checkout methods typically have lower sort orders.
    /// </summary>
    public int DefaultSortOrder { get; init; }

    /// <summary>
    /// Whether this method should be shown in customer checkout by default.
    /// False for backoffice-only methods like Manual Payment.
    /// </summary>
    public bool ShowInCheckoutByDefault { get; init; } = true;

    /// <summary>
    /// The type/category of this payment method for deduplication.
    /// Use constants from <see cref="PaymentMethodTypes"/> (e.g., "cards", "apple-pay", "google-pay").
    /// Methods with the same MethodType are deduplicated at checkout - only the one
    /// with the lowest SortOrder from an enabled provider is shown.
    /// Null or unique values are not deduplicated.
    /// </summary>
    /// <example>
    /// <code>
    /// MethodType = PaymentMethodTypes.ApplePay
    /// </code>
    /// </example>
    public string? MethodType { get; init; }

    /// <summary>
    /// Regions/countries where this payment method is available.
    /// Uses ISO 3166-1 alpha-2 country codes (e.g., "NL", "BE", "AT") or region codes (e.g., "EU").
    /// Empty/null means globally available. Used for admin UI display and potential checkout filtering.
    /// </summary>
    public IReadOnlyList<PaymentMethodRegion>? SupportedRegions { get; init; }
}
