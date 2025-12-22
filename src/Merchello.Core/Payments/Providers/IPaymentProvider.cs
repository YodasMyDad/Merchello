using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Merchello.Core.Payments.Models;

namespace Merchello.Core.Payments.Providers;

/// <summary>
/// Contract that payment provider plugins must implement.
/// Providers can offer multiple payment methods, each with its own integration type.
/// </summary>
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
}

