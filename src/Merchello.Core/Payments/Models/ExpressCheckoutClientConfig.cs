namespace Merchello.Core.Payments.Models;

/// <summary>
/// Client-side configuration for initializing an express checkout button.
/// Providers return this to tell the frontend how to render and initialize their express checkout.
/// </summary>
public class ExpressCheckoutClientConfig
{
    /// <summary>
    /// The provider alias (e.g., "stripe", "paypal", "braintree").
    /// </summary>
    public required string ProviderAlias { get; init; }

    /// <summary>
    /// The method alias (e.g., "applepay", "googlepay", "paypal").
    /// </summary>
    public required string MethodAlias { get; init; }

    /// <summary>
    /// URL to load the provider's JavaScript SDK.
    /// The frontend will dynamically load this script before initializing.
    /// </summary>
    public string? SdkUrl { get; init; }

    /// <summary>
    /// Provider-specific configuration passed to the SDK initialization.
    /// For Stripe: { "publishableKey": "pk_...", "appearance": {...} }
    /// For PayPal: { "clientId": "...", "currency": "GBP" }
    /// For Braintree: { "authorization": "...", "paypal": {...} }
    /// </summary>
    public Dictionary<string, object> SdkConfig { get; init; } = [];

    /// <summary>
    /// The type of button to render. Maps to PaymentMethodType.
    /// Used by the frontend to select the appropriate button renderer.
    /// </summary>
    public PaymentMethodType? MethodType { get; init; }

    /// <summary>
    /// Optional URL to a custom JavaScript file that handles this provider's express checkout.
    /// If provided, the frontend will load this script which should register an adapter
    /// for handling the express checkout flow for this provider.
    /// </summary>
    public string? CustomAdapterUrl { get; init; }

    /// <summary>
    /// CSS class(es) to apply to the button container.
    /// </summary>
    public string? ButtonContainerClass { get; init; }

    /// <summary>
    /// Whether this express checkout method is available in the current context.
    /// For example, Apple Pay is only available on Safari/Apple devices.
    /// The frontend should check this and hide unavailable methods.
    /// </summary>
    public bool IsAvailable { get; init; } = true;

    /// <summary>
    /// Message to display if the method is not available.
    /// </summary>
    public string? UnavailableMessage { get; init; }
}
