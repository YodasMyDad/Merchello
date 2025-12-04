using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Accounting.Services.Interfaces;

public interface IInvoiceService
{
    /// <summary>
    /// Query invoices with filtering, pagination and sorting
    /// </summary>
    Task<PaginatedList<Invoice>> QueryInvoices(InvoiceQueryParameters parameters, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get an invoice by ID with all related data
    /// </summary>
    Task<Invoice?> GetInvoiceAsync(Guid invoiceId, CancellationToken cancellationToken = default);

    Task<Invoice> CreateOrderFromBasketAsync(Basket basket, CheckoutSession checkoutSession, CancellationToken cancellationToken = default);
    Task<List<Shipment>> CreateShipmentsFromOrderAsync(CreateShipmentsParameters parameters, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> UpdateOrderStatusAsync(Guid orderId, OrderStatus newStatus, string? reason = null, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> CancelOrderAsync(Guid orderId, string reason, CancellationToken cancellationToken = default);
    Task<Order?> GetOrderWithDetailsAsync(Guid orderId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Soft-delete multiple invoices by setting IsDeleted = true
    /// </summary>
    /// <param name="invoiceIds">The IDs of the invoices to soft-delete</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Number of invoices successfully deleted</returns>
    Task<int> SoftDeleteInvoicesAsync(IEnumerable<Guid> invoiceIds, CancellationToken cancellationToken = default);

    /// <summary>
    /// Check if an invoice exists
    /// </summary>
    Task<bool> InvoiceExistsAsync(Guid invoiceId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get order statistics for today (orders, items, fulfilled, delivered)
    /// </summary>
    Task<OrderStatsDto> GetOrderStatsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Get dashboard statistics with monthly metrics and percentage changes
    /// </summary>
    Task<DashboardStatsDto> GetDashboardStatsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Add a note to an invoice
    /// </summary>
    Task<CrudResult<InvoiceNote>> AddNoteAsync(Guid invoiceId, string text, bool visibleToCustomer, CancellationToken cancellationToken = default);

    /// <summary>
    /// Update the billing address for an invoice
    /// </summary>
    Task<CrudResult<Address>> UpdateBillingAddressAsync(Guid invoiceId, Address address, CancellationToken cancellationToken = default);

    /// <summary>
    /// Update the shipping address for an invoice
    /// </summary>
    Task<CrudResult<Address>> UpdateShippingAddressAsync(Guid invoiceId, Address address, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get fulfillment summary for an invoice including warehouse names
    /// </summary>
    Task<FulfillmentSummaryDto?> GetFulfillmentSummaryAsync(Guid invoiceId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Create a shipment for an order
    /// </summary>
    Task<CrudResult<Shipment>> CreateShipmentAsync(CreateShipmentParameters parameters, CancellationToken cancellationToken = default);

    /// <summary>
    /// Update shipment tracking information
    /// </summary>
    Task<CrudResult<Shipment>> UpdateShipmentAsync(UpdateShipmentParameters parameters, CancellationToken cancellationToken = default);

    /// <summary>
    /// Delete a shipment (releases items back to unfulfilled)
    /// </summary>
    Task<bool> DeleteShipmentAsync(Guid shipmentId, CancellationToken cancellationToken = default);
}

