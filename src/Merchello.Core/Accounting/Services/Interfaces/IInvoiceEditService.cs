using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core.Shared;

namespace Merchello.Core.Accounting.Services.Interfaces;

public interface IInvoiceEditService
{
    /// <summary>
    /// Get invoice data prepared for editing (includes stock availability checks)
    /// </summary>
    Task<InvoiceForEditDto?> GetInvoiceForEditAsync(Guid invoiceId, CancellationToken cancellationToken = default);

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
    /// Preview the calculated discount values for a line item without persisting.
    /// Centralizes discount math for UI previews.
    /// </summary>
    Task<PreviewDiscountResultDto> PreviewDiscountAsync(
        PreviewDiscountRequestDto request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Edit an invoice (update quantities, apply discounts, add custom items, etc.)
    /// Validates stock availability for products and uses product tax groups for tax calculations.
    /// </summary>
    /// <param name="parameters">Parameters for editing the invoice</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task<OperationResult<EditInvoiceResultDto>> EditInvoiceAsync(EditInvoiceParameters parameters, CancellationToken cancellationToken = default);
}
