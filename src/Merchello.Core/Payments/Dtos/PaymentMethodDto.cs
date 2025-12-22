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
    /// Icon identifier or URL.
    /// </summary>
    public string? Icon { get; set; }

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
}
