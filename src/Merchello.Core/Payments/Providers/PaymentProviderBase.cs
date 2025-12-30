using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Merchello.Core.Payments.Models;

namespace Merchello.Core.Payments.Providers;

/// <summary>
/// Optional base class for payment providers providing default implementations.
/// Providers can implement IPaymentProvider directly if preferred.
/// </summary>
public abstract class PaymentProviderBase : IPaymentProvider
{
    /// <summary>
    /// The current configuration for this provider.
    /// </summary>
    protected PaymentProviderConfiguration? Configuration { get; private set; }

    /// <inheritdoc />
    public abstract PaymentProviderMetadata Metadata { get; }

    /// <inheritdoc />
    public abstract IReadOnlyList<PaymentMethodDefinition> GetAvailablePaymentMethods();

    /// <inheritdoc />
    public virtual ValueTask<IEnumerable<PaymentProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default)
    {
        return ValueTask.FromResult<IEnumerable<PaymentProviderConfigurationField>>([]);
    }

    /// <inheritdoc />
    public virtual ValueTask ConfigureAsync(
        PaymentProviderConfiguration? configuration,
        CancellationToken cancellationToken = default)
    {
        Configuration = configuration;
        return ValueTask.CompletedTask;
    }

    // =====================================================
    // Payment Flow
    // =====================================================

    /// <inheritdoc />
    public abstract Task<PaymentSessionResult> CreatePaymentSessionAsync(
        PaymentRequest request,
        CancellationToken cancellationToken = default);

    /// <inheritdoc />
    public abstract Task<PaymentResult> ProcessPaymentAsync(
        ProcessPaymentRequest request,
        CancellationToken cancellationToken = default);

    // =====================================================
    // Express Checkout
    // =====================================================

    /// <inheritdoc />
    public virtual Task<ExpressCheckoutClientConfig?> GetExpressCheckoutClientConfigAsync(
        string methodAlias,
        decimal amount,
        string currency,
        CancellationToken cancellationToken = default)
    {
        // Default implementation returns null - providers should override for express checkout support
        return Task.FromResult<ExpressCheckoutClientConfig?>(null);
    }

    /// <inheritdoc />
    public virtual Task<ExpressCheckoutResult> ProcessExpressCheckoutAsync(
        ExpressCheckoutRequest request,
        CancellationToken cancellationToken = default)
    {
        // Default implementation for providers that don't support express checkout
        return Task.FromResult(ExpressCheckoutResult.Failed(
            "This payment provider does not support express checkout."));
    }

    // =====================================================
    // Capture
    // =====================================================

    /// <inheritdoc />
    public virtual Task<PaymentCaptureResult> CapturePaymentAsync(
        string transactionId,
        decimal? amount = null,
        CancellationToken cancellationToken = default)
    {
        // Default implementation for providers that don't support auth-and-capture
        return Task.FromResult(new PaymentCaptureResult
        {
            Success = false,
            ErrorMessage = "This payment provider does not support authorization and capture."
        });
    }

    /// <inheritdoc />
    public virtual Task<RefundResult> RefundPaymentAsync(
        RefundRequest request,
        CancellationToken cancellationToken = default)
    {
        // Default implementation for providers that don't support refunds
        return Task.FromResult(new RefundResult
        {
            Success = false,
            ErrorMessage = "This payment provider does not support refunds."
        });
    }

    /// <inheritdoc />
    public virtual Task<bool> ValidateWebhookAsync(
        string payload,
        IDictionary<string, string> headers,
        CancellationToken cancellationToken = default)
    {
        // Default implementation - providers should override if they use webhooks
        return Task.FromResult(false);
    }

    /// <inheritdoc />
    public virtual Task<WebhookProcessingResult> ProcessWebhookAsync(
        string payload,
        IDictionary<string, string> headers,
        CancellationToken cancellationToken = default)
    {
        // Default implementation - providers should override if they use webhooks
        return Task.FromResult(new WebhookProcessingResult
        {
            Success = false,
            ErrorMessage = "This payment provider does not support webhooks."
        });
    }

    // =====================================================
    // Webhook Testing
    // =====================================================

    /// <inheritdoc />
    public virtual ValueTask<IReadOnlyList<WebhookEventTemplate>> GetWebhookEventTemplatesAsync(
        CancellationToken cancellationToken = default)
    {
        // Default implementation - returns empty list for providers without webhook testing support
        return ValueTask.FromResult<IReadOnlyList<WebhookEventTemplate>>([]);
    }

    /// <inheritdoc />
    public virtual ValueTask<(string Payload, IDictionary<string, string> Headers)> GenerateTestWebhookPayloadAsync(
        TestWebhookParameters parameters,
        CancellationToken cancellationToken = default)
    {
        // Default implementation - providers should override for webhook testing support
        return ValueTask.FromResult<(string, IDictionary<string, string>)>(
            ("{}", new Dictionary<string, string>()));
    }
}

