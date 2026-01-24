using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Shared.Providers;
using Microsoft.AspNetCore.Http;

namespace Merchello.Core.Fulfilment.Providers.Interfaces;

/// <summary>
/// Contract that fulfilment provider plugins must implement.
/// </summary>
public interface IFulfilmentProvider
{
    /// <summary>
    /// Static metadata describing the provider.
    /// </summary>
    FulfilmentProviderMetadata Metadata { get; }

    /// <summary>
    /// Gets the configuration fields required by this provider (API keys, credentials, etc.).
    /// Used to generate dynamic configuration UI in the backoffice.
    /// </summary>
    ValueTask<IEnumerable<ProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Applies persisted configuration for the provider.
    /// </summary>
    ValueTask ConfigureAsync(FulfilmentProviderConfiguration? configuration,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Tests the connection to the fulfilment provider.
    /// </summary>
    Task<FulfilmentConnectionTestResult> TestConnectionAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Submits an order to the fulfilment provider.
    /// </summary>
    Task<FulfilmentOrderResult> SubmitOrderAsync(FulfilmentOrderRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Cancels an order at the fulfilment provider.
    /// </summary>
    Task<FulfilmentCancelResult> CancelOrderAsync(string providerReference,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Validates an incoming webhook request from the provider.
    /// </summary>
    Task<bool> ValidateWebhookAsync(HttpRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Processes an incoming webhook request from the provider.
    /// </summary>
    Task<FulfilmentWebhookResult> ProcessWebhookAsync(HttpRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Polls the provider for order status updates.
    /// </summary>
    Task<IReadOnlyList<FulfilmentStatusUpdate>> PollOrderStatusAsync(IEnumerable<string> providerReferences,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Syncs products to the fulfilment provider.
    /// </summary>
    Task<FulfilmentSyncResult> SyncProductsAsync(IEnumerable<FulfilmentProduct> products,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets inventory levels from the fulfilment provider.
    /// </summary>
    Task<IReadOnlyList<FulfilmentInventoryLevel>> GetInventoryLevelsAsync(
        CancellationToken cancellationToken = default);
}
