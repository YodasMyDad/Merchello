using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Merchello.Core.Payments.Models;

namespace Merchello.Core.Payments.Providers.Interfaces;

/// <summary>
/// Contract that payment provider plugins must implement.
/// Providers can offer multiple payment methods, each with its own integration type.
/// </summary>
/// <remarks>
/// <para><b>Implementation Guide</b></para>
/// <para>
/// Extend <see cref="PaymentProviderBase"/> instead of implementing this interface directly.
/// The base class provides sensible defaults for optional features.
/// </para>
///
/// <para><b>Required (4 methods)</b> - Must be implemented:</para>
/// <list type="bullet">
///   <item><see cref="Metadata"/> - Provider name, alias, and capabilities</item>
///   <item><see cref="GetAvailablePaymentMethods"/> - Declare supported payment methods</item>
///   <item><see cref="CreatePaymentSessionAsync"/> - Create payment session with SDK config</item>
///   <item><see cref="ProcessPaymentAsync"/> - Process the payment result</item>
/// </list>
///
/// <para><b>Optional</b> - Have working defaults in PaymentProviderBase:</para>
/// <list type="bullet">
///   <item><see cref="GetConfigurationFieldsAsync"/> - Returns empty (no config needed)</item>
///   <item><see cref="ConfigureAsync"/> - Stores configuration automatically</item>
///   <item><see cref="GetExpressCheckoutClientConfigAsync"/> - Returns null (no express checkout)</item>
///   <item><see cref="ProcessExpressCheckoutAsync"/> - Returns "not supported"</item>
///   <item><see cref="CapturePaymentAsync"/> - Returns "not supported"</item>
///   <item><see cref="RefundPaymentAsync"/> - Returns "not supported"</item>
///   <item><see cref="ValidateWebhookAsync"/> - Returns false</item>
///   <item><see cref="ProcessWebhookAsync"/> - Returns "not supported"</item>
/// </list>
///
/// <para><b>Example - Minimal provider (like ManualPaymentProvider):</b></para>
/// <code>
/// public class MyProvider : PaymentProviderBase
/// {
///     public override PaymentProviderMetadata Metadata => new() { Alias = "myprovider", Name = "My Provider" };
///     public override IReadOnlyList&lt;PaymentMethodDefinition&gt; GetAvailablePaymentMethods() => [...];
///     public override Task&lt;PaymentSessionResult&gt; CreatePaymentSessionAsync(...) => ...;
///     public override Task&lt;PaymentResult&gt; ProcessPaymentAsync(...) => ...;
/// }
/// </code>
/// </remarks>
public interface IPaymentProvider
{
    /// <summary>
    /// Provider metadata - alias is immutable and set on the class.
    /// Describes the gateway itself (Stripe, Braintree, etc.).
    /// </summary>
    PaymentProviderMetadata Metadata { get; }

    /// <summary>
    /// Get the payment methods this provider supports.
    /// Each method can have a different integration type and express checkout capability.
    /// </summary>
    IReadOnlyList<PaymentMethodDefinition> GetAvailablePaymentMethods();

    // =====================================================
    // Configuration
    // =====================================================

    /// <summary>
    /// Get the configuration fields required by this provider (for backoffice UI).
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Field definitions for dynamic configuration UI.</returns>
    ValueTask<IEnumerable<PaymentProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Configure the provider with saved settings.
    /// </summary>
    /// <param name="configuration">The stored configuration (if any).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    ValueTask ConfigureAsync(
        PaymentProviderConfiguration? configuration,
        CancellationToken cancellationToken = default);

    // =====================================================
    // Payment Flow
    // =====================================================

    /// <summary>
    /// Create a payment session - returns what the frontend needs to render the payment UI.
    /// Based on IntegrationType, this may include redirect URL, client token, SDK config, or form fields.
    /// </summary>
    /// <param name="request">Payment request details.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Session result containing the appropriate data for the integration type.</returns>
    Task<PaymentSessionResult> CreatePaymentSessionAsync(
        PaymentRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Process the result from client-side interaction.
    /// Called after redirect return, SDK tokenization, or form submission.
    /// </summary>
    /// <param name="request">The payment processing request with tokens/form data.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result of the payment processing.</returns>
    Task<PaymentResult> ProcessPaymentAsync(
        ProcessPaymentRequest request,
        CancellationToken cancellationToken = default);

    // =====================================================
    // Express Checkout
    // =====================================================

    /// <summary>
    /// Get client-side SDK configuration for an express checkout method.
    /// This returns the information needed to initialize the express checkout button on the frontend.
    /// </summary>
    /// <param name="methodAlias">The method alias (e.g., "applepay", "googlepay", "paypal").</param>
    /// <param name="amount">The payment amount.</param>
    /// <param name="currency">The currency code (e.g., "GBP", "USD").</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>SDK configuration for client-side initialization, or null if not supported.</returns>
    Task<ExpressCheckoutClientConfig?> GetExpressCheckoutClientConfigAsync(
        string methodAlias,
        decimal amount,
        string currency,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Process an express checkout payment (Apple Pay, Google Pay, PayPal).
    /// Express checkout flows return both payment authorization and customer data,
    /// allowing the order to be created in a single step.
    /// </summary>
    /// <param name="request">Express checkout request with payment token and customer data.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result of the express checkout payment.</returns>
    Task<ExpressCheckoutResult> ProcessExpressCheckoutAsync(
        ExpressCheckoutRequest request,
        CancellationToken cancellationToken = default);

    // =====================================================
    // Capture (for auth-then-capture flow)
    // =====================================================

    /// <summary>
    /// Capture an authorized payment (for auth-then-capture flow).
    /// </summary>
    /// <param name="transactionId">The transaction ID to capture.</param>
    /// <param name="amount">Optional amount to capture (for partial capture).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result of the capture operation.</returns>
    Task<PaymentCaptureResult> CapturePaymentAsync(
        string transactionId,
        decimal? amount = null,
        CancellationToken cancellationToken = default);

    // =====================================================
    // Refunds
    // =====================================================

    /// <summary>
    /// Process a refund.
    /// </summary>
    /// <param name="request">Refund request details.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result of the refund operation.</returns>
    Task<RefundResult> RefundPaymentAsync(
        RefundRequest request,
        CancellationToken cancellationToken = default);

    // =====================================================
    // Webhooks
    // =====================================================

    /// <summary>
    /// Validate an incoming webhook signature.
    /// </summary>
    /// <param name="payload">Raw webhook payload.</param>
    /// <param name="headers">HTTP headers from the webhook request.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>True if the webhook signature is valid.</returns>
    Task<bool> ValidateWebhookAsync(
        string payload,
        IDictionary<string, string> headers,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Process a validated webhook payload.
    /// </summary>
    /// <param name="payload">Raw webhook payload.</param>
    /// <param name="headers">HTTP headers from the webhook request.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result of webhook processing.</returns>
    Task<WebhookProcessingResult> ProcessWebhookAsync(
        string payload,
        IDictionary<string, string> headers,
        CancellationToken cancellationToken = default);

    // =====================================================
    // Webhook Testing (for backoffice simulation)
    // =====================================================

    /// <summary>
    /// Get available webhook event templates that can be simulated.
    /// Used by the backoffice to show which events can be tested.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>List of webhook events that can be simulated.</returns>
    ValueTask<IReadOnlyList<WebhookEventTemplate>> GetWebhookEventTemplatesAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Generate a test webhook payload for simulation.
    /// The payload should be in the provider's expected format.
    /// </summary>
    /// <param name="parameters">Parameters for generating the test payload.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Generated payload and headers for webhook simulation.</returns>
    ValueTask<(string Payload, IDictionary<string, string> Headers)> GenerateTestWebhookPayloadAsync(
        TestWebhookParameters parameters,
        CancellationToken cancellationToken = default);

    // =====================================================
    // Payment Links (for admin-generated shareable URLs)
    // =====================================================

    /// <summary>
    /// Create a shareable payment link for an invoice.
    /// Used by admin to generate links that customers can use to pay.
    /// </summary>
    /// <param name="request">Payment link request details.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result containing the payment URL and provider reference.</returns>
    Task<PaymentLinkResult> CreatePaymentLinkAsync(
        PaymentLinkRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Deactivate a previously created payment link.
    /// </summary>
    /// <param name="providerLinkId">The provider's link ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>True if deactivation succeeded.</returns>
    Task<bool> DeactivatePaymentLinkAsync(
        string providerLinkId,
        CancellationToken cancellationToken = default);
}

