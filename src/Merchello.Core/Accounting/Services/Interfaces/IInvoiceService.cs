using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Shared;
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
    /// Get orders for export within a date range
    /// </summary>
    /// <param name="fromDate">Start date (inclusive)</param>
    /// <param name="toDate">End date (inclusive)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of order export items for CSV generation</returns>
    Task<List<OrderExportItemDto>> GetOrdersForExportAsync(
        DateTime fromDate,
        DateTime toDate,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Add a note to an invoice
    /// </summary>
    /// <param name="invoiceId">The invoice ID</param>
    /// <param name="text">The note text</param>
    /// <param name="visibleToCustomer">Whether the note is visible to the customer</param>
    /// <param name="authorId">Optional author user ID</param>
    /// <param name="authorName">Optional author name (defaults to "System" if not provided)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task<CrudResult<InvoiceNote>> AddNoteAsync(Guid invoiceId, string text, bool visibleToCustomer, Guid? authorId = null, string? authorName = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Update the billing address for an invoice
    /// </summary>
    Task<CrudResult<Address>> UpdateBillingAddressAsync(Guid invoiceId, Address address, CancellationToken cancellationToken = default);

    /// <summary>
    /// Update the shipping address for an invoice
    /// </summary>
    Task<CrudResult<Address>> UpdateShippingAddressAsync(Guid invoiceId, Address address, CancellationToken cancellationToken = default);

    /// <summary>
    /// Update the purchase order number for an invoice
    /// </summary>
    Task<CrudResult<string?>> UpdatePurchaseOrderAsync(Guid invoiceId, string? purchaseOrder, CancellationToken cancellationToken = default);

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

    /// <summary>
    /// Get count of invoices by billing email address
    /// </summary>
    Task<int> GetInvoiceCountByBillingEmailAsync(string email, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get total count of invoices
    /// </summary>
    Task<int> GetInvoiceCountAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Get shipping option names by their IDs for display purposes
    /// </summary>
    Task<Dictionary<Guid, string>> GetShippingOptionNamesAsync(IEnumerable<Guid> shippingOptionIds, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get invoice data prepared for editing (includes stock availability checks)
    /// </summary>
    Task<InvoiceForEditDto?> GetInvoiceForEditAsync(Guid invoiceId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Edit an invoice (update quantities, apply discounts, add custom items, etc.)
    /// Validates stock availability for products and uses product tax groups for tax calculations.
    /// </summary>
    Task<OperationResult<EditInvoiceResultDto>> EditInvoiceAsync(
        Guid invoiceId,
        EditInvoiceDto request,
        Guid? authorId,
        string? authorName,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Preview the calculated totals for proposed invoice changes without persisting.
    /// This is the single source of truth for all invoice calculations.
    /// Frontend should call this instead of calculating locally.
    /// </summary>
    Task<PreviewEditResultDto?> PreviewInvoiceEditAsync(
        Guid invoiceId,
        EditInvoiceDto request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Create a draft order from the admin backoffice.
    /// Creates an invoice with a single order, ready for products to be added via edit.
    /// </summary>
    /// <param name="request">The draft order request with addresses and optional custom items</param>
    /// <param name="authorId">Optional author user ID for timeline note</param>
    /// <param name="authorName">Optional author name for timeline note</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Result containing the new invoice ID and number, or error message</returns>
    Task<OperationResult<CreateDraftOrderResultDto>> CreateDraftOrderAsync(
        CreateDraftOrderDto request,
        Guid? authorId,
        string? authorName,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Search for customers by email or name, returning their info and past shipping addresses.
    /// Used for customer lookup when creating orders in the backoffice.
    /// </summary>
    /// <param name="email">Email to search (exact or partial match)</param>
    /// <param name="name">Name to search (partial match)</param>
    /// <param name="limit">Maximum number of results to return</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of matching customers with their de-duplicated past shipping addresses</returns>
    Task<List<CustomerLookupResultDto>> SearchCustomersAsync(
        string? email,
        string? name,
        int limit = 10,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get all invoices for a customer by their billing email address.
    /// Used for displaying customer order history in the backoffice.
    /// </summary>
    /// <param name="email">The customer's billing email address</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of invoices for the customer, ordered by date descending</returns>
    Task<List<Invoice>> GetInvoicesByBillingEmailAsync(
        string email,
        CancellationToken cancellationToken = default);
}

