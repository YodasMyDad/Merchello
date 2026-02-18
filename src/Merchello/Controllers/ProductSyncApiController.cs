using Asp.Versioning;
using Merchello.Core.ProductSync.Dtos;
using Merchello.Core.ProductSync.Models;
using Merchello.Core.ProductSync.Services.Interfaces;
using Merchello.Core.Shared.Models.Enums;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Core.Security;

namespace Merchello.Controllers;

[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class ProductSyncApiController(
    IProductSyncService productSyncService,
    IBackOfficeSecurityAccessor backOfficeSecurityAccessor) : MerchelloApiControllerBase
{
    [HttpPost("product-sync/imports/validate")]
    [ProducesResponseType<ProductImportValidationDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ValidateImport(
        IFormFile? file,
        [FromForm] ProductSyncProfile profile = ProductSyncProfile.ShopifyStrict,
        [FromForm] int? maxIssues = null,
        CancellationToken cancellationToken = default)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("CSV file is required.");
        }

        await using var stream = file.OpenReadStream();
        try
        {
            var validation = await productSyncService.ValidateImportAsync(
                stream,
                file.FileName,
                new ValidateProductImportDto
                {
                    Profile = profile,
                    MaxIssues = maxIssues
                },
                cancellationToken);

            return Ok(validation);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("product-sync/imports/start")]
    [ProducesResponseType<ProductSyncRunDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> StartImport(
        IFormFile? file,
        [FromForm] ProductSyncProfile profile = ProductSyncProfile.ShopifyStrict,
        [FromForm] bool continueOnImageFailure = false,
        [FromForm] int? maxIssues = null,
        CancellationToken cancellationToken = default)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("CSV file is required.");
        }

        var currentUser = backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
        var requestedByUserId = currentUser?.Key.ToString();
        var requestedByUserName = currentUser?.Name ?? currentUser?.Username;

        await using var stream = file.OpenReadStream();
        try
        {
            var result = await productSyncService.StartImportAsync(
                stream,
                file.FileName,
                new StartProductImportDto
                {
                    Profile = profile,
                    ContinueOnImageFailure = continueOnImageFailure,
                    MaxIssues = maxIssues
                },
                requestedByUserId,
                requestedByUserName,
                cancellationToken);

            if (result.Success && result.ResultObject != null)
            {
                return Ok(result.ResultObject);
            }

            var errors = result.Messages
                .Where(x => x.ResultMessageType == ResultMessageType.Error)
                .Select(x => x.Message)
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .ToList();

            if (errors.Any(x => x?.Contains("already queued or running", StringComparison.OrdinalIgnoreCase) == true))
            {
                return Conflict(new { errors });
            }

            return BadRequest(new { errors });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("product-sync/exports/start")]
    [ProducesResponseType<ProductSyncRunDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> StartExport(
        [FromBody] StartProductExportDto? request,
        CancellationToken cancellationToken = default)
    {
        var currentUser = backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
        var requestedByUserId = currentUser?.Key.ToString();
        var requestedByUserName = currentUser?.Name ?? currentUser?.Username;

        var result = await productSyncService.StartExportAsync(
            request ?? new StartProductExportDto(),
            requestedByUserId,
            requestedByUserName,
            cancellationToken);

        if (result.Success && result.ResultObject != null)
        {
            return Ok(result.ResultObject);
        }

        var errors = result.Messages
            .Where(x => x.ResultMessageType == ResultMessageType.Error)
            .Select(x => x.Message)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .ToList();

        return BadRequest(new { errors });
    }

    [HttpGet("product-sync/runs")]
    [ProducesResponseType<ProductSyncRunPageDto>(StatusCodes.Status200OK)]
    public async Task<ProductSyncRunPageDto> GetRuns(
        [FromQuery] ProductSyncDirection? direction,
        [FromQuery] ProductSyncRunStatus? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        return await productSyncService.GetRunsAsync(
            direction,
            status,
            page,
            pageSize,
            cancellationToken);
    }

    [HttpGet("product-sync/runs/{id:guid}")]
    [ProducesResponseType<ProductSyncRunDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetRun(Guid id, CancellationToken cancellationToken = default)
    {
        var run = await productSyncService.GetRunAsync(id, cancellationToken);
        if (run == null)
        {
            return NotFound();
        }

        return Ok(run);
    }

    [HttpGet("product-sync/runs/{id:guid}/issues")]
    [ProducesResponseType<ProductSyncIssuePageDto>(StatusCodes.Status200OK)]
    public async Task<ProductSyncIssuePageDto> GetRunIssues(
        Guid id,
        [FromQuery] ProductSyncIssueSeverity? severity,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 200,
        CancellationToken cancellationToken = default)
    {
        return await productSyncService.GetIssuesAsync(id, severity, page, pageSize, cancellationToken);
    }

    [HttpGet("product-sync/runs/{id:guid}/download")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DownloadExport(Guid id, CancellationToken cancellationToken = default)
    {
        var artifact = await productSyncService.OpenExportArtifactAsync(id, cancellationToken);
        if (!artifact.HasValue)
        {
            return NotFound();
        }

        return File(artifact.Value.Stream, artifact.Value.ContentType, artifact.Value.FileName);
    }
}
