using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Shared;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Services.Parameters;

namespace Merchello.Core.Shipping.Services.Interfaces;

/// <summary>
/// Service for managing shipments and fulfillment operations.
/// </summary>
public interface IShipmentService
{
    /// <summary>
    /// Create shipments from an order, grouping by warehouse.
    /// Allocates inventory for shipped items.
    /// </summary>
    /// <param name="parameters">Parameters for creating shipments</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of created shipments</returns>
    Task<List<Shipment>> CreateShipmentsFromOrderAsync(
        CreateShipmentsParameters parameters,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Create a single shipment for an order with specific line items.
    /// </summary>
    /// <param name="parameters">Parameters for creating the shipment</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Result containing the created shipment or error</returns>
    Task<CrudResult<Shipment>> CreateShipmentAsync(
        CreateShipmentParameters parameters,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Update shipment tracking information.
    /// Auto-completes order when all shipments are delivered.
    /// </summary>
    /// <param name="parameters">Parameters for updating the shipment</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Result containing the updated shipment or error</returns>
    Task<CrudResult<Shipment>> UpdateShipmentAsync(
        UpdateShipmentParameters parameters,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Update shipment status with optional tracking information.
    /// Transitions: Preparing → Shipped → Delivered (or → Cancelled from any state).
    /// Updates order status accordingly when shipments are shipped or delivered.
    /// </summary>
    /// <param name="parameters">Parameters for updating the shipment status</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Result containing the updated shipment or error</returns>
    Task<CrudResult<Shipment>> UpdateShipmentStatusAsync(
        UpdateShipmentStatusParameters parameters,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Delete a shipment, releasing items back to unfulfilled status.
    /// Reverts order status based on remaining shipments.
    /// </summary>
    /// <param name="shipmentId">The shipment ID to delete</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>True if deleted successfully</returns>
    Task<bool> DeleteShipmentAsync(
        Guid shipmentId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get fulfillment summary for an invoice including warehouse names.
    /// Shows all orders with their shipment status and line item progress.
    /// </summary>
    /// <param name="invoiceId">The invoice ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Fulfillment summary or null if invoice not found</returns>
    Task<FulfillmentSummaryDto?> GetFulfillmentSummaryAsync(
        Guid invoiceId,
        CancellationToken cancellationToken = default);
}
