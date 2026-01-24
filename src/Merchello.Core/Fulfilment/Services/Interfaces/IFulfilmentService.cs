using Merchello.Core.Accounting.Models;
using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Fulfilment.Services.Interfaces;

/// <summary>
/// Service for managing order fulfilment operations.
/// </summary>
public interface IFulfilmentService
{
    /// <summary>
    /// Submits an order to its configured fulfilment provider.
    /// </summary>
    Task<CrudResult<Order>> SubmitOrderAsync(Guid orderId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Retries submission for a failed order.
    /// </summary>
    Task<CrudResult<Order>> RetrySubmissionAsync(Guid orderId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Cancels an order at the fulfilment provider.
    /// </summary>
    Task<CrudResult<Order>> CancelOrderAsync(Guid orderId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Processes a status update from a fulfilment provider.
    /// </summary>
    Task<CrudResult<Order>> ProcessStatusUpdateAsync(FulfilmentStatusUpdate update, CancellationToken cancellationToken = default);

    /// <summary>
    /// Processes a shipment update from a fulfilment provider.
    /// </summary>
    Task<CrudResult<Shipment>> ProcessShipmentUpdateAsync(FulfilmentShipmentUpdate update, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets orders that need to be polled for status updates.
    /// </summary>
    Task<IReadOnlyList<Order>> GetOrdersForPollingAsync(Guid providerConfigId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Resolves the fulfilment provider configuration for a warehouse.
    /// Returns null if manual fulfilment.
    /// </summary>
    Task<FulfilmentProviderConfiguration?> ResolveProviderForWarehouseAsync(Guid warehouseId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets orders that are ready for retry based on retry count and delay.
    /// </summary>
    Task<IReadOnlyList<Order>> GetOrdersReadyForRetryAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks if a webhook with the given message ID has already been processed.
    /// </summary>
    Task<bool> IsDuplicateWebhookAsync(Guid providerConfigId, string messageId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Logs a processed webhook for idempotency tracking.
    /// </summary>
    Task LogWebhookAsync(Guid providerConfigId, string? messageId, string? eventType, string? payload, CancellationToken cancellationToken = default);
}
