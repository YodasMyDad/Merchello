using Asp.Versioning;
using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

/// <summary>
/// API controller for tax group management
/// </summary>
[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class TaxApiController(ITaxService taxService) : MerchelloApiControllerBase
{
    /// <summary>
    /// Get all tax groups
    /// </summary>
    [HttpGet("tax-groups")]
    [ProducesResponseType<List<TaxGroupDto>>(StatusCodes.Status200OK)]
    public async Task<List<TaxGroupDto>> GetTaxGroups(CancellationToken ct)
    {
        var taxGroups = await taxService.GetTaxGroups(ct);
        return taxGroups
            .OrderBy(tg => tg.Name)
            .Select(tg => new TaxGroupDto
            {
                Id = tg.Id,
                Name = tg.Name ?? "Unnamed",
                TaxPercentage = tg.TaxPercentage
            })
            .ToList();
    }

    /// <summary>
    /// Get a single tax group by ID
    /// </summary>
    [HttpGet("tax-groups/{id:guid}")]
    [ProducesResponseType<TaxGroupDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetTaxGroup(Guid id, CancellationToken ct)
    {
        var taxGroup = await taxService.GetTaxGroup(id, ct);
        if (taxGroup == null)
        {
            return NotFound();
        }

        return Ok(new TaxGroupDto
        {
            Id = taxGroup.Id,
            Name = taxGroup.Name ?? "Unnamed",
            TaxPercentage = taxGroup.TaxPercentage
        });
    }

    /// <summary>
    /// Create a new tax group
    /// </summary>
    [HttpPost("tax-groups")]
    [ProducesResponseType<TaxGroupDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateTaxGroup([FromBody] CreateTaxGroupDto dto, CancellationToken ct)
    {
        var result = await taxService.CreateTaxGroup(dto.Name, dto.TaxPercentage, ct);
        if (!result.Successful)
        {
            return BadRequest(result.Messages.FirstOrDefault()?.Message ?? "Failed to create tax group.");
        }

        var taxGroup = result.ResultObject!;
        var taxGroupDto = new TaxGroupDto
        {
            Id = taxGroup.Id,
            Name = taxGroup.Name ?? "Unnamed",
            TaxPercentage = taxGroup.TaxPercentage
        };

        return Created($"/api/v1/tax-groups/{taxGroup.Id}", taxGroupDto);
    }

    /// <summary>
    /// Update an existing tax group
    /// </summary>
    [HttpPut("tax-groups/{id:guid}")]
    [ProducesResponseType<TaxGroupDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateTaxGroup(Guid id, [FromBody] UpdateTaxGroupDto dto, CancellationToken ct)
    {
        // First check if the tax group exists
        var existing = await taxService.GetTaxGroup(id, ct);
        if (existing == null)
        {
            return NotFound("Tax group not found.");
        }

        // Update the properties
        existing.Name = dto.Name;
        existing.TaxPercentage = dto.TaxPercentage;

        var result = await taxService.UpdateTaxGroup(existing, ct);
        if (!result.Successful)
        {
            return BadRequest(result.Messages.FirstOrDefault()?.Message ?? "Failed to update tax group.");
        }

        var taxGroup = result.ResultObject!;
        return Ok(new TaxGroupDto
        {
            Id = taxGroup.Id,
            Name = taxGroup.Name ?? "Unnamed",
            TaxPercentage = taxGroup.TaxPercentage
        });
    }

    /// <summary>
    /// Delete a tax group
    /// </summary>
    [HttpDelete("tax-groups/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteTaxGroup(Guid id, CancellationToken ct)
    {
        var result = await taxService.DeleteTaxGroup(id, ct);
        if (!result.Successful)
        {
            var errorMessage = result.Messages.FirstOrDefault()?.Message;
            if (errorMessage?.Contains("not found", StringComparison.OrdinalIgnoreCase) == true)
            {
                return NotFound(errorMessage);
            }
            return BadRequest(errorMessage ?? "Failed to delete tax group.");
        }

        return NoContent();
    }
}
