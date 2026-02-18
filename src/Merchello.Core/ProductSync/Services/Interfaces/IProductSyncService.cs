using Merchello.Core.ProductSync.Dtos;
using Merchello.Core.ProductSync.Models;
using Merchello.Core.Shared.Models;

namespace Merchello.Core.ProductSync.Services.Interfaces;

public interface IProductSyncService
{
    Task<ProductImportValidationDto> ValidateImportAsync(
        Stream csvStream,
        string fileName,
        ValidateProductImportDto request,
        CancellationToken cancellationToken = default);

    Task<CrudResult<ProductSyncRunDto>> StartImportAsync(
        Stream csvStream,
        string fileName,
        StartProductImportDto request,
        string? requestedByUserId,
        string? requestedByUserName,
        CancellationToken cancellationToken = default);

    Task<CrudResult<ProductSyncRunDto>> StartExportAsync(
        StartProductExportDto request,
        string? requestedByUserId,
        string? requestedByUserName,
        CancellationToken cancellationToken = default);

    Task<ProductSyncRunPageDto> GetRunsAsync(
        ProductSyncDirection? direction,
        ProductSyncRunStatus? status,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<ProductSyncRunDto?> GetRunAsync(Guid runId, CancellationToken cancellationToken = default);

    Task<ProductSyncIssuePageDto> GetIssuesAsync(
        Guid runId,
        ProductSyncIssueSeverity? severity,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<(Stream Stream, string FileName, string ContentType)?> OpenExportArtifactAsync(
        Guid runId,
        CancellationToken cancellationToken = default);

    Task<bool> TryProcessNextQueuedRunAsync(CancellationToken cancellationToken = default);

    Task CleanupRunsAsync(CancellationToken cancellationToken = default);
}
