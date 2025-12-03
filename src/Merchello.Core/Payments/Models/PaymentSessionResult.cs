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
    /// URL to the payment provider's JavaScript SDK.
    /// </summary>
    public string? JavaScriptSdkUrl { get; init; }

    /// <summary>
    /// Configuration object to pass to the JavaScript SDK.
    /// Structure varies by provider.
    /// </summary>
    public Dictionary<string, object>? SdkConfiguration { get; init; }

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
    /// </summary>
    public static PaymentSessionResult HostedFields(
        string clientToken,
        string jsSdkUrl,
        Dictionary<string, object>? sdkConfig = null,
        string? sessionId = null) => new()
    {
        Success = true,
        IntegrationType = PaymentIntegrationType.HostedFields,
        ClientToken = clientToken,
        JavaScriptSdkUrl = jsSdkUrl,
        SdkConfiguration = sdkConfig,
        SessionId = sessionId
    };

    /// <summary>
    /// Creates a successful widget result.
    /// </summary>
    public static PaymentSessionResult Widget(
        string clientToken,
        string jsSdkUrl,
        Dictionary<string, object>? sdkConfig = null,
        string? sessionId = null) => new()
    {
        Success = true,
        IntegrationType = PaymentIntegrationType.Widget,
        ClientToken = clientToken,
        JavaScriptSdkUrl = jsSdkUrl,
        SdkConfiguration = sdkConfig,
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
