using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Shared;
using Merchello.Core.Shared.Models;

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

    /// <summary>
    /// Creates an invoice and order(s) from a basket.
    /// This is the single source of truth for order creation from checkout.
    /// </summary>
    /// <param name="basket">The basket to create an invoice from.</param>
    /// <param name="checkoutSession">The checkout session with addresses and shipping selections.</param>
    /// <param name="source">Optional source tracking information. Defaults to web checkout if not provided.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <remarks>
    /// <para><b>Basket Lifecycle:</b> The basket is NOT automatically deleted after order creation.
    /// This allows for order recovery/retry scenarios. The basket should be cleared by the caller
    /// (typically CheckoutPaymentsApiController) after successful payment completion.</para>
    /// <para><b>Multi-warehouse:</b> Creates separate Order entities per warehouse group.</para>
    /// <para><b>Stock:</b> Reserves stock immediately upon order creation.</para>
    /// </remarks>
    Task<Invoice> CreateOrderFromBasketAsync(Basket basket, CheckoutSession checkoutSession, InvoiceSource? source = null, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> UpdateOrderStatusAsync(Guid orderId, OrderStatus newStatus, string? reason = null, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> CancelOrderAsync(Guid orderId, string reason, CancellationToken cancellationToken = default);

    /// <summary>
    /// Cancel an invoice and all its unfulfilled orders.
    /// Orders that are already shipped/completed will remain unchanged.
    /// </summary>
    /// <param name="parameters">Cancellation parameters including invoice ID, reason, and author</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Result with number of orders cancelled, or error if invoice cannot be cancelled</returns>
    Task<CrudResult<int>> CancelInvoiceAsync(CancelInvoiceParameters parameters, CancellationToken cancellationToken = default);

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
    /// Add a note to an invoice
    /// </summary>
    /// <param name="parameters">Parameters for adding the note</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task<CrudResult<InvoiceNote>> AddNoteAsync(AddInvoiceNoteParameters parameters, CancellationToken cancellationToken = default);

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
    /// Sets or clears the due date on an invoice.
    /// Used for testing/seeding overdue scenarios.
    /// </summary>
    /// <param name="invoiceId">The invoice ID to update</param>
    /// <param name="dueDate">The due date to set, or null to clear</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Result containing the updated invoice or error</returns>
    Task<CrudResult<Invoice>> SetDueDateAsync(Guid invoiceId, DateTime? dueDate, CancellationToken cancellationToken = default);

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
    /// <param name="parameters">Parameters for editing the invoice</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task<OperationResult<EditInvoiceResultDto>> EditInvoiceAsync(EditInvoiceParameters parameters, CancellationToken cancellationToken = default);

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

    /// <summary>
    /// Apply a promotional discount to an existing invoice.
    /// Validates the discount, calculates the amount, and creates the discount line item.
    /// </summary>
    /// <param name="parameters">Parameters including invoice ID, discount ID, and author info</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Result with updated invoice or error</returns>
    Task<CrudResult<Invoice>> ApplyPromotionalDiscountAsync(
        ApplyPromotionalDiscountParameters parameters,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets an unpaid invoice that was created from a specific basket.
    /// Used to reuse existing invoices when a user returns to checkout, preventing ghost orders.
    /// </summary>
    /// <param name="basketId">The basket ID to search for</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The unpaid invoice if found, null otherwise</returns>
    Task<Invoice?> GetUnpaidInvoiceForBasketAsync(Guid basketId, CancellationToken cancellationToken = default);
}

