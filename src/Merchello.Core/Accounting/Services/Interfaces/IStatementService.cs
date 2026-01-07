using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core.Shared;
using Merchello.Core.Shared.Models;

namespace Merchello.Core.Accounting.Services.Interfaces;

/// <summary>
/// Service for generating customer statements, account management, and outstanding balance tracking.
/// </summary>
public interface IStatementService
{
    /// <summary>
    /// Gets the statement data for a customer, including all transactions in the period.
    /// </summary>
    /// <param name="parameters">Statement generation parameters.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Statement data DTO.</returns>
    Task<CustomerStatementDto> GetStatementDataAsync(
        GenerateStatementParameters parameters,
        CancellationToken ct = default);

    /// <summary>
    /// Generates a PDF statement for a customer.
    /// </summary>
    /// <param name="parameters">Statement generation parameters.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>PDF document as byte array.</returns>
    Task<byte[]> GenerateStatementPdfAsync(
        GenerateStatementParameters parameters,
        CancellationToken ct = default);

    /// <summary>
    /// Gets all outstanding (unpaid) invoices for a customer, sorted by due date.
    /// Uses CalculatePaymentStatus to determine outstanding balance.
    /// </summary>
    /// <param name="customerId">The customer ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>List of outstanding invoices with computed DueDate fields.</returns>
    Task<List<OrderListItemDto>> GetOutstandingInvoicesForCustomerAsync(
        Guid customerId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the outstanding balance summary for a customer.
    /// Uses CalculatePaymentStatus for each invoice to ensure accurate totals.
    /// </summary>
    /// <param name="customerId">The customer ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Outstanding balance summary with totals, overdue amounts, and credit status.</returns>
    Task<OutstandingBalanceDto> GetOutstandingBalanceAsync(
        Guid customerId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all outstanding invoices with filtering and pagination.
    /// For the Outstanding sidebar section in the backoffice.
    /// </summary>
    /// <param name="parameters">Query parameters for filtering, sorting, and pagination.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Paginated list of outstanding invoices.</returns>
    Task<PaginatedList<OrderListItemDto>> GetOutstandingInvoicesPagedAsync(
        OutstandingInvoicesQueryParameters parameters,
        CancellationToken cancellationToken = default);
}
