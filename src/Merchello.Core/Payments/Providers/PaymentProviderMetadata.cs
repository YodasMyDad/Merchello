namespace Merchello.Core.Payments.Providers;

/// <summary>
/// Immutable metadata describing a payment provider (gateway) implementation.
/// Providers can offer multiple payment methods via GetAvailablePaymentMethods().
/// </summary>
public class PaymentProviderMetadata
{
    /// <summary>
    /// Unique alias for the provider (immutable, set on class).
    /// e.g., "stripe", "paypal", "braintree"
    /// </summary>
    public required string Alias { get; init; }

    /// <summary>
    /// Display name shown in UI.
    /// </summary>
    public required string DisplayName { get; init; }

    /// <summary>
    /// Optional icon URL or CSS class.
    /// </summary>
    public string? Icon { get; init; }

    /// <summary>
    /// Description of the provider.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Whether this provider supports refunds.
    /// </summary>
    public bool SupportsRefunds { get; init; } = true;

    /// <summary>
    /// Whether this provider supports partial refunds.
    /// </summary>
    public bool SupportsPartialRefunds { get; init; } = true;

    /// <summary>
    /// Whether this provider supports authorization-then-capture.
    /// </summary>
    public bool SupportsAuthAndCapture { get; init; } = false;

    /// <summary>
    /// Whether this provider requires webhook configuration.
    /// </summary>
    public bool RequiresWebhook { get; init; } = false;

    /// <summary>
    /// Webhook endpoint path for this provider.
    /// </summary>
    public string WebhookPath => $"/umbraco/merchello/webhooks/payments/{Alias}";

    /// <summary>
    /// Optional setup instructions/documentation for developers.
    /// Supports markdown formatting.
    /// </summary>
    public string? SetupInstructions { get; init; }
}

