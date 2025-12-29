using System.Collections.Generic;

namespace Merchello.Core.Payments.Models;

/// <summary>
/// Result of creating a payment session. Contains everything the frontend needs
/// to render the appropriate payment UI based on the integration type.
/// </summary>
public class PaymentSessionResult
{
    /// <summary>
    /// Whether the session was created successfully.
    /// </summary>
    public required bool Success { get; init; }

    /// <summary>
    /// Error message if Success is false.
    /// </summary>
    public string? ErrorMessage { get; init; }

    /// <summary>
    /// Error code from the payment provider.
    /// </summary>
    public string? ErrorCode { get; init; }

    /// <summary>
    /// Session identifier (provider's session ID or internal reference).
    /// Used to correlate the session when processing the payment.
    /// </summary>
    public string? SessionId { get; init; }

    /// <summary>
    /// How the frontend should handle this payment.
    /// </summary>
    public PaymentIntegrationType IntegrationType { get; init; }

    // =====================================================
    // For Redirect integration type
    // =====================================================

    /// <summary>
    /// URL to redirect the customer to for payment.
    /// Only set when IntegrationType is Redirect.
    /// </summary>
    public string? RedirectUrl { get; init; }

    // =====================================================
    // For HostedFields / Widget integration types
    // =====================================================

    /// <summary>
    /// Client token for initializing the payment provider's JavaScript SDK.
    /// Used by Braintree, Klarna, and similar providers.
    /// </summary>
    public string? ClientToken { get; init; }

    /// <summary>
    /// Client secret for client-side payment confirmation.
    /// Used by Stripe Elements/PaymentIntents.
    /// </summary>
    public string? ClientSecret { get; init; }

    /// <summary>
    /// URL to the payment provider's JavaScript SDK (e.g., Stripe.js, Braintree SDK).
    /// </summary>
    public string? JavaScriptSdkUrl { get; init; }

    /// <summary>
    /// Configuration object to pass to the JavaScript SDK.
    /// Structure varies by provider.
    /// </summary>
    public Dictionary<string, object>? SdkConfiguration { get; init; }

    // =====================================================
    // Adapter pattern support
    // =====================================================

    /// <summary>
    /// URL to the payment adapter JavaScript file.
    /// The adapter handles provider-specific initialization and payment flow.
    /// Required for HostedFields and Widget integration types.
    /// </summary>
    public string? AdapterUrl { get; init; }

    /// <summary>
    /// The provider alias for adapter registration (e.g., "stripe", "braintree").
    /// Used by the checkout to look up the adapter in window.MerchelloPaymentAdapters.
    /// </summary>
    public string? ProviderAlias { get; init; }

    /// <summary>
    /// The method alias within the provider (e.g., "cards", "applepay").
    /// </summary>
    public string? MethodAlias { get; init; }

    // =====================================================
    // For DirectForm integration type
    // =====================================================

    /// <summary>
    /// Form fields to render at checkout for DirectForm providers.
    /// </summary>
    public IEnumerable<CheckoutFormField>? FormFields { get; init; }

    // =====================================================
    // Factory methods
    // =====================================================

    /// <summary>
    /// Creates a failed result with an error message.
    /// </summary>
    public static PaymentSessionResult Failed(string errorMessage, string? errorCode = null) => new()
    {
        Success = false,
        ErrorMessage = errorMessage,
        ErrorCode = errorCode
    };

    /// <summary>
    /// Creates a successful redirect result.
    /// </summary>
    public static PaymentSessionResult Redirect(string redirectUrl, string? sessionId = null) => new()
    {
        Success = true,
        IntegrationType = PaymentIntegrationType.Redirect,
        RedirectUrl = redirectUrl,
        SessionId = sessionId
    };

    /// <summary>
    /// Creates a successful hosted fields result.
    /// Used for inline card entry fields rendered via provider's JavaScript SDK (e.g., Stripe Elements, Braintree Hosted Fields).
    /// </summary>
    /// <param name="providerAlias">Provider alias for adapter lookup (e.g., "stripe", "braintree").</param>
    /// <param name="methodAlias">Method alias within the provider (e.g., "cards").</param>
    /// <param name="adapterUrl">URL to the JavaScript adapter file.</param>
    /// <param name="jsSdkUrl">URL to the provider's JavaScript SDK.</param>
    /// <param name="sdkConfig">Configuration object to pass to the SDK.</param>
    /// <param name="clientToken">Client token for SDK initialization (Braintree-style).</param>
    /// <param name="clientSecret">Client secret for payment confirmation (Stripe-style).</param>
    /// <param name="sessionId">Session identifier for correlation.</param>
    public static PaymentSessionResult HostedFields(
        string providerAlias,
        string methodAlias,
        string adapterUrl,
        string jsSdkUrl,
        Dictionary<string, object>? sdkConfig = null,
        string? clientToken = null,
        string? clientSecret = null,
        string? sessionId = null) => new()
    {
        Success = true,
        IntegrationType = PaymentIntegrationType.HostedFields,
        ProviderAlias = providerAlias,
        MethodAlias = methodAlias,
        AdapterUrl = adapterUrl,
        JavaScriptSdkUrl = jsSdkUrl,
        SdkConfiguration = sdkConfig,
        ClientToken = clientToken,
        ClientSecret = clientSecret,
        SessionId = sessionId
    };

    /// <summary>
    /// Creates a successful widget result.
    /// Used for embedded provider UI widgets (e.g., Apple Pay button, Google Pay button, PayPal button).
    /// </summary>
    /// <param name="providerAlias">Provider alias for adapter lookup (e.g., "stripe", "paypal").</param>
    /// <param name="methodAlias">Method alias within the provider (e.g., "applepay", "googlepay").</param>
    /// <param name="adapterUrl">URL to the JavaScript adapter file.</param>
    /// <param name="jsSdkUrl">URL to the provider's JavaScript SDK.</param>
    /// <param name="sdkConfig">Configuration object to pass to the SDK.</param>
    /// <param name="clientToken">Client token for SDK initialization.</param>
    /// <param name="sessionId">Session identifier for correlation.</param>
    public static PaymentSessionResult Widget(
        string providerAlias,
        string methodAlias,
        string adapterUrl,
        string jsSdkUrl,
        Dictionary<string, object>? sdkConfig = null,
        string? clientToken = null,
        string? sessionId = null) => new()
    {
        Success = true,
        IntegrationType = PaymentIntegrationType.Widget,
        ProviderAlias = providerAlias,
        MethodAlias = methodAlias,
        AdapterUrl = adapterUrl,
        JavaScriptSdkUrl = jsSdkUrl,
        SdkConfiguration = sdkConfig,
        ClientToken = clientToken,
        SessionId = sessionId
    };

    /// <summary>
    /// Creates a successful direct form result.
    /// </summary>
    public static PaymentSessionResult DirectForm(
        IEnumerable<CheckoutFormField> formFields,
        string? sessionId = null) => new()
    {
        Success = true,
        IntegrationType = PaymentIntegrationType.DirectForm,
        FormFields = formFields,
        SessionId = sessionId
    };
}
