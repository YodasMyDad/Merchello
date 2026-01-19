using Merchello.Core.DigitalProducts.Models;
using Merchello.Core.DigitalProducts.Services.Parameters;
using Merchello.Core.Shared.Models;

namespace Merchello.Core.DigitalProducts.Services.Interfaces;

/// <summary>
/// Service for managing digital product downloads.
/// </summary>
public interface IDigitalProductService
{
    /// <summary>
    /// Creates download links for all digital products in an invoice.
    /// Idempotent - returns existing links if already created.
    /// </summary>
    Task<CrudResult<List<DownloadLink>>> CreateDownloadLinksAsync(
        CreateDownloadLinksParameters parameters,
        CancellationToken ct = default);

    /// <summary>
    /// Validates a download token and returns the download link if valid.
    /// </summary>
    Task<CrudResult<DownloadLink>> ValidateDownloadTokenAsync(
        ValidateDownloadTokenParameters parameters,
        CancellationToken ct = default);

    /// <summary>
    /// Records a download and increments the download count.
    /// </summary>
    Task<CrudResult<bool>> RecordDownloadAsync(Guid downloadLinkId, CancellationToken ct = default);

    /// <summary>
    /// Gets all download links for a customer.
    /// </summary>
    Task<List<DownloadLink>> GetCustomerDownloadsAsync(
        GetCustomerDownloadsParameters parameters,
        CancellationToken ct = default);

    /// <summary>
    /// Gets all download links for an invoice.
    /// </summary>
    Task<List<DownloadLink>> GetInvoiceDownloadsAsync(Guid invoiceId, CancellationToken ct = default);

    /// <summary>
    /// Checks if an invoice contains only digital products (no physical items).
    /// </summary>
    Task<bool> IsDigitalOnlyInvoiceAsync(Guid invoiceId, CancellationToken ct = default);

    /// <summary>
    /// Regenerates download links for an invoice, invalidating old links.
    /// </summary>
    Task<CrudResult<List<DownloadLink>>> RegenerateDownloadLinksAsync(
        RegenerateDownloadLinksParameters parameters,
        CancellationToken ct = default);
}
