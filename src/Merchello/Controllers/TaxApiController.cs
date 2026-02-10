using Asp.Versioning;
using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Locality.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Tax.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Merchello.Controllers;

/// <summary>
/// API controller for tax group management
/// </summary>
[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class TaxApiController(
    ITaxService taxService,
    ITaxCalculationService taxCalculationService,
    ILocalityCatalog localityCatalog,
    IOptions<MerchelloSettings> settings) : MerchelloApiControllerBase
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
    /// Preview tax calculation for a custom item.
    /// Used by add-custom-item modal to show tax preview before adding item.
    /// </summary>
    [HttpPost("tax-groups/preview-custom-item")]
    [ProducesResponseType<PreviewCustomItemTaxResultDto>(StatusCodes.Status200OK)]
    public async Task<PreviewCustomItemTaxResultDto> PreviewCustomItemTax(
        [FromBody] PreviewCustomItemTaxRequestDto request,
        CancellationToken ct)
    {
        var taxRate = 0m;

        if (request.TaxGroupId.HasValue)
        {
            var taxGroup = await taxService.GetTaxGroup(request.TaxGroupId.Value, ct);
            taxRate = taxGroup?.TaxPercentage ?? 0m;
        }

        var result = taxCalculationService.PreviewTax(
            request.Price + request.AddonsTotal,
            request.Quantity,
            taxRate,
            settings.Value.StoreCurrencyCode);

        return new PreviewCustomItemTaxResultDto
        {
            Subtotal = result.Subtotal,
            TaxRate = result.TaxRate,
            TaxAmount = result.TaxAmount,
            Total = result.Total
        };
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
        if (!result.Success)
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
        var result = await taxService.UpdateTaxGroup(id, dto.Name, dto.TaxPercentage, ct);

        if (!result.Success)
        {
            var message = result.Messages.FirstOrDefault()?.Message ?? "Failed to update tax group.";
            return message.Contains("not found", StringComparison.OrdinalIgnoreCase)
                ? NotFound(message)
                : BadRequest(message);
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
        if (!result.Success)
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

    #region Tax Group Rates

    /// <summary>
    /// Get all rates for a tax group
    /// </summary>
    [HttpGet("tax-groups/{taxGroupId:guid}/rates")]
    [ProducesResponseType<List<TaxGroupRateDto>>(StatusCodes.Status200OK)]
    public async Task<List<TaxGroupRateDto>> GetTaxGroupRates(Guid taxGroupId, CancellationToken ct)
    {
        var rates = await taxService.GetRatesForTaxGroup(taxGroupId, ct);

        var result = new List<TaxGroupRateDto>();
        foreach (var rate in rates)
        {
            var countryName = await localityCatalog.TryGetCountryNameAsync(rate.CountryCode);
            string? regionName = null;
            if (!string.IsNullOrEmpty(rate.RegionCode))
            {
                regionName = await localityCatalog.TryGetRegionNameAsync(rate.CountryCode, rate.RegionCode);
            }

            result.Add(new TaxGroupRateDto
            {
                Id = rate.Id,
                TaxGroupId = rate.TaxGroupId,
                CountryCode = rate.CountryCode,
                RegionCode = rate.RegionCode,
                TaxPercentage = rate.TaxPercentage,
                CountryName = countryName,
                RegionName = regionName
            });
        }

        return result;
    }

    /// <summary>
    /// Create a new geographic tax rate for a tax group
    /// </summary>
    [HttpPost("tax-groups/{taxGroupId:guid}/rates")]
    [ProducesResponseType<TaxGroupRateDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateTaxGroupRate(
        Guid taxGroupId,
        [FromBody] CreateTaxGroupRateDto dto,
        CancellationToken ct)
    {
        var result = await taxService.CreateTaxGroupRate(
            taxGroupId,
            dto.CountryCode,
            dto.RegionCode,
            dto.TaxPercentage,
            ct);

        if (!result.Success)
        {
            var message = result.Messages.FirstOrDefault()?.Message ?? "Failed to create tax rate.";
            return message.Contains("not found", StringComparison.OrdinalIgnoreCase)
                ? NotFound(message)
                : BadRequest(message);
        }

        var rate = result.ResultObject!;
        var countryName = await localityCatalog.TryGetCountryNameAsync(rate.CountryCode);
        string? regionName = null;
        if (!string.IsNullOrEmpty(rate.RegionCode))
        {
            regionName = await localityCatalog.TryGetRegionNameAsync(rate.CountryCode, rate.RegionCode);
        }

        var rateDto = new TaxGroupRateDto
        {
            Id = rate.Id,
            TaxGroupId = rate.TaxGroupId,
            CountryCode = rate.CountryCode,
            RegionCode = rate.RegionCode,
            TaxPercentage = rate.TaxPercentage,
            CountryName = countryName,
            RegionName = regionName
        };

        return Created($"/api/v1/tax-groups/{taxGroupId}/rates/{rate.Id}", rateDto);
    }

    /// <summary>
    /// Update an existing geographic tax rate
    /// </summary>
    [HttpPut("tax-groups/rates/{rateId:guid}")]
    [ProducesResponseType<TaxGroupRateDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateTaxGroupRate(
        Guid rateId,
        [FromBody] UpdateTaxGroupRateDto dto,
        CancellationToken ct)
    {
        var result = await taxService.UpdateTaxGroupRate(rateId, dto.TaxPercentage, ct);

        if (!result.Success)
        {
            var message = result.Messages.FirstOrDefault()?.Message ?? "Failed to update tax rate.";
            return message.Contains("not found", StringComparison.OrdinalIgnoreCase)
                ? NotFound(message)
                : BadRequest(message);
        }

        var rate = result.ResultObject!;
        var countryName = await localityCatalog.TryGetCountryNameAsync(rate.CountryCode);
        string? regionName = null;
        if (!string.IsNullOrEmpty(rate.RegionCode))
        {
            regionName = await localityCatalog.TryGetRegionNameAsync(rate.CountryCode, rate.RegionCode);
        }

        return Ok(new TaxGroupRateDto
        {
            Id = rate.Id,
            TaxGroupId = rate.TaxGroupId,
            CountryCode = rate.CountryCode,
            RegionCode = rate.RegionCode,
            TaxPercentage = rate.TaxPercentage,
            CountryName = countryName,
            RegionName = regionName
        });
    }

    /// <summary>
    /// Delete a geographic tax rate
    /// </summary>
    [HttpDelete("tax-groups/rates/{rateId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteTaxGroupRate(Guid rateId, CancellationToken ct)
    {
        var result = await taxService.DeleteTaxGroupRate(rateId, ct);

        if (!result.Success)
        {
            var message = result.Messages.FirstOrDefault()?.Message ?? "Failed to delete tax rate.";
            return message.Contains("not found", StringComparison.OrdinalIgnoreCase)
                ? NotFound(message)
                : BadRequest(message);
        }

        return NoContent();
    }

    #endregion
}
