using Asp.Versioning;
using Merchello.Core.HealthChecks;
using Merchello.Core.HealthChecks.Dtos;
using Merchello.Core.HealthChecks.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class HealthChecksApiController(IHealthCheckService healthCheckService) : MerchelloApiControllerBase
{
    [HttpGet("health-checks")]
    [ProducesResponseType<IReadOnlyList<HealthCheckMetadataDto>>(StatusCodes.Status200OK)]
    public async Task<IReadOnlyList<HealthCheckMetadataDto>> GetAvailableChecks(CancellationToken ct)
    {
        var checks = await healthCheckService.GetAvailableChecksAsync(ct);

        return checks.Select(m => new HealthCheckMetadataDto
        {
            Alias = m.Alias,
            Name = m.Name,
            Description = m.Description,
            Icon = m.Icon,
            SortOrder = m.SortOrder,
        }).ToList();
    }

    [HttpPost("health-checks/{alias}/run")]
    [ProducesResponseType<HealthCheckResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RunCheck(string alias, CancellationToken ct)
    {
        var checks = await healthCheckService.GetAvailableChecksAsync(ct);
        var metadata = checks.FirstOrDefault(c =>
            string.Equals(c.Alias, alias, StringComparison.OrdinalIgnoreCase));

        if (metadata is null)
        {
            return NotFound();
        }

        var result = await healthCheckService.RunCheckAsync(alias, ct);

        return Ok(new HealthCheckResultDto
        {
            Alias = metadata.Alias,
            Name = metadata.Name,
            Description = metadata.Description,
            Icon = metadata.Icon,
            Status = result.Status.ToString().ToLowerInvariant(),
            Summary = result.Summary,
            AffectedCount = result.AffectedCount,
        });
    }

    [HttpGet("health-checks/{alias}/details")]
    [ProducesResponseType<HealthCheckDetailPageDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCheckDetail(
        string alias,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 25;

        var checks = await healthCheckService.GetAvailableChecksAsync(ct);
        var metadata = checks.FirstOrDefault(c =>
            string.Equals(c.Alias, alias, StringComparison.OrdinalIgnoreCase));

        if (metadata is null)
        {
            return NotFound();
        }

        var detail = await healthCheckService.GetCheckDetailAsync(alias, page, pageSize, ct);

        return Ok(new HealthCheckDetailPageDto
        {
            Items = detail.Items.Select(i => new HealthCheckDetailItemDto
            {
                Id = i.Id,
                Name = i.Name,
                Description = i.Description,
                EditPath = i.EditPath,
                ImageUrl = i.ImageUrl,
            }).ToList(),
            Page = detail.Page,
            PageSize = detail.PageSize,
            TotalItems = detail.TotalItems,
            TotalPages = detail.TotalPages,
        });
    }
}
