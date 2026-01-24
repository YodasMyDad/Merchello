using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Fulfilment.Providers.Interfaces;
using Merchello.Core.Shared.Providers;
using Microsoft.AspNetCore.Http;

namespace Merchello.Core.Fulfilment.Providers;

/// <summary>
/// Base class for fulfilment providers with default implementations for optional methods.
/// </summary>
public abstract class FulfilmentProviderBase : IFulfilmentProvider
{
    /// <summary>
    /// Stored configuration after ConfigureAsync is called.
    /// </summary>
    protected FulfilmentProviderConfiguration? Configuration { get; private set; }

    /// <inheritdoc />
    public abstract FulfilmentProviderMetadata Metadata { get; }

    /// <inheritdoc />
    public virtual ValueTask<IEnumerable<ProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default)
    {
        return ValueTask.FromResult(Enumerable.Empty<ProviderConfigurationField>());
    }

    /// <inheritdoc />
    public virtual ValueTask ConfigureAsync(FulfilmentProviderConfiguration? configuration,
        CancellationToken cancellationToken = default)
    {
        Configuration = configuration;
        return ValueTask.CompletedTask;
    }

    /// <inheritdoc />
    /// <remarks>
    /// Default implementation returns not supported.
    /// Override to implement connection testing.
    /// </remarks>
    public virtual Task<FulfilmentConnectionTestResult> TestConnectionAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult(FulfilmentConnectionTestResult.NotSupported());
    }

    /// <inheritdoc />
    /// <remarks>
    /// Default implementation returns failure.
    /// Override to implement order submission.
    /// </remarks>
    public virtual Task<FulfilmentOrderResult> SubmitOrderAsync(FulfilmentOrderRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!Metadata.SupportsOrderSubmission)
        {
            return Task.FromResult(FulfilmentOrderResult.Failed("Provider does not support order submission"));
        }

        return Task.FromResult(FulfilmentOrderResult.Failed($"Provider {Metadata.Key} has not implemented SubmitOrderAsync"));
    }

    /// <inheritdoc />
    /// <remarks>
    /// Default implementation returns not supported.
    /// Override to implement order cancellation.
    /// </remarks>
    public virtual Task<FulfilmentCancelResult> CancelOrderAsync(string providerReference,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult(FulfilmentCancelResult.NotSupported());
    }

    /// <inheritdoc />
    /// <remarks>
    /// Default implementation returns true (no validation).
    /// Override to implement webhook signature validation.
    /// </remarks>
    public virtual Task<bool> ValidateWebhookAsync(HttpRequest request, CancellationToken cancellationToken = default)
    {
        if (!Metadata.SupportsWebhooks)
        {
            return Task.FromResult(false);
        }

        return Task.FromResult(true);
    }

    /// <inheritdoc />
    /// <remarks>
    /// Default implementation returns not supported.
    /// Override to implement webhook processing.
    /// </remarks>
    public virtual Task<FulfilmentWebhookResult> ProcessWebhookAsync(HttpRequest request,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult(FulfilmentWebhookResult.NotSupported());
    }

    /// <inheritdoc />
    /// <remarks>
    /// Default implementation returns empty list.
    /// Override to implement status polling.
    /// </remarks>
    public virtual Task<IReadOnlyList<FulfilmentStatusUpdate>> PollOrderStatusAsync(IEnumerable<string> providerReferences,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult<IReadOnlyList<FulfilmentStatusUpdate>>([]);
    }

    /// <inheritdoc />
    /// <remarks>
    /// Default implementation returns not supported.
    /// Override to implement product sync.
    /// </remarks>
    public virtual Task<FulfilmentSyncResult> SyncProductsAsync(IEnumerable<FulfilmentProduct> products,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult(FulfilmentSyncResult.NotSupported());
    }

    /// <inheritdoc />
    /// <remarks>
    /// Default implementation returns empty list.
    /// Override to implement inventory sync.
    /// </remarks>
    public virtual Task<IReadOnlyList<FulfilmentInventoryLevel>> GetInventoryLevelsAsync(
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult<IReadOnlyList<FulfilmentInventoryLevel>>([]);
    }
}
