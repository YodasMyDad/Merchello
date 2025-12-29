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
    /// Icon identifier or URL for the payment method (legacy).
    /// </summary>
    public string? Icon { get; init; }

    /// <summary>
    /// Icon HTML/SVG markup for the payment method.
    /// When provided, this is used instead of Icon for rendering.
    /// Provider controls the visual appearance of the icon.
    /// </summary>
    public string? IconHtml { get; init; }

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
    /// The type/category of this payment method (e.g., Cards, ApplePay, GooglePay).
    /// Used for deduplication when multiple providers offer the same method type.
    /// Methods with the same MethodType are deduplicated at checkout - only the one
    /// with the lowest SortOrder from an enabled provider is shown.
    /// Null or Custom types are not deduplicated.
    /// </summary>
    public PaymentMethodType? MethodType { get; init; }
}
