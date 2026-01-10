using Asp.Versioning;
using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Locality.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

/// <summary>
/// API controller for shipping tax override management
/// </summary>
[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class ShippingTaxApiController(
    ITaxService taxService,
    ILocalityCatalog localityCatalog) : MerchelloApiControllerBase
{
    /// <summary>
    /// Get all shipping tax overrides
    /// </summary>
    [HttpGet("shipping-tax-overrides")]
    [ProducesResponseType<List<ShippingTaxOverrideDto>>(StatusCodes.Status200OK)]
    public async Task<List<ShippingTaxOverrideDto>> GetAll(CancellationToken ct)
    {
        var overrides = await taxService.GetAllShippingTaxOverridesAsync(ct);

        var result = new List<ShippingTaxOverrideDto>();
        foreach (var item in overrides)
        {
            var countryName = await localityCatalog.TryGetCountryNameAsync(item.CountryCode);
            string? regionName = null;
            if (!string.IsNullOrEmpty(item.StateOrProvinceCode))
            {
                regionName = await localityCatalog.TryGetRegionNameAsync(
                    item.CountryCode, item.StateOrProvinceCode);
            }

            result.Add(new ShippingTaxOverrideDto
            {
                Id = item.Id,
                CountryCode = item.CountryCode,
                StateOrProvinceCode = item.StateOrProvinceCode,
                ShippingTaxGroupId = item.ShippingTaxGroupId,
                ShippingTaxGroupName = item.ShippingTaxGroup?.Name,
                ShippingTaxGroupPercentage = item.ShippingTaxGroup?.TaxPercentage,
                CountryName = countryName,
                RegionName = regionName,
                DateCreated = item.DateCreated,
                DateUpdated = item.DateUpdated
            });
        }

        return result;
    }

    /// <summary>
    /// Get a single shipping tax override by ID
    /// </summary>
    [HttpGet("shipping-tax-overrides/{id:guid}")]
    [ProducesResponseType<ShippingTaxOverrideDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var item = await taxService.GetShippingTaxOverrideByIdAsync(id, ct);
        if (item == null)
        {
            return NotFound();
        }

        var countryName = await localityCatalog.TryGetCountryNameAsync(item.CountryCode);
        string? regionName = null;
        if (!string.IsNullOrEmpty(item.StateOrProvinceCode))
        {
            regionName = await localityCatalog.TryGetRegionNameAsync(
                item.CountryCode, item.StateOrProvinceCode);
        }

        return Ok(new ShippingTaxOverrideDto
        {
            Id = item.Id,
            CountryCode = item.CountryCode,
            StateOrProvinceCode = item.StateOrProvinceCode,
            ShippingTaxGroupId = item.ShippingTaxGroupId,
            ShippingTaxGroupName = item.ShippingTaxGroup?.Name,
            ShippingTaxGroupPercentage = item.ShippingTaxGroup?.TaxPercentage,
            CountryName = countryName,
            RegionName = regionName,
            DateCreated = item.DateCreated,
            DateUpdated = item.DateUpdated
        });
    }

    /// <summary>
    /// Create a new shipping tax override
    /// </summary>
    [HttpPost("shipping-tax-overrides")]
    [ProducesResponseType<ShippingTaxOverrideDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create(
        [FromBody] CreateShippingTaxOverrideDto dto,
        CancellationToken ct)
    {
        var result = await taxService.CreateShippingTaxOverrideAsync(dto, ct);
        if (!result.Successful)
        {
            return BadRequest(result.Messages.FirstOrDefault()?.Message ?? "Failed to create shipping tax override.");
        }

        var item = result.ResultObject!;
        var countryName = await localityCatalog.TryGetCountryNameAsync(item.CountryCode);
        string? regionName = null;
        if (!string.IsNullOrEmpty(item.StateOrProvinceCode))
        {
            regionName = await localityCatalog.TryGetRegionNameAsync(
                item.CountryCode, item.StateOrProvinceCode);
        }

        // Fetch tax group if assigned
        string? taxGroupName = null;
        decimal? taxGroupPercentage = null;
        if (item.ShippingTaxGroupId.HasValue)
        {
            var taxGroup = await taxService.GetTaxGroup(item.ShippingTaxGroupId.Value, ct);
            taxGroupName = taxGroup?.Name;
            taxGroupPercentage = taxGroup?.TaxPercentage;
        }

        var responseDto = new ShippingTaxOverrideDto
        {
            Id = item.Id,
            CountryCode = item.CountryCode,
            StateOrProvinceCode = item.StateOrProvinceCode,
            ShippingTaxGroupId = item.ShippingTaxGroupId,
            ShippingTaxGroupName = taxGroupName,
            ShippingTaxGroupPercentage = taxGroupPercentage,
            CountryName = countryName,
            RegionName = regionName,
            DateCreated = item.DateCreated,
            DateUpdated = item.DateUpdated
        };

        return Created($"/api/v1/shipping-tax-overrides/{item.Id}", responseDto);
    }

    /// <summary>
    /// Update an existing shipping tax override
    /// </summary>
    [HttpPut("shipping-tax-overrides/{id:guid}")]
    [ProducesResponseType<ShippingTaxOverrideDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateShippingTaxOverrideDto dto,
        CancellationToken ct)
    {
        var result = await taxService.UpdateShippingTaxOverrideAsync(id, dto, ct);
        if (!result.Successful)
        {
            var message = result.Messages.FirstOrDefault()?.Message ?? "Failed to update shipping tax override.";
            return message.Contains("not found", StringComparison.OrdinalIgnoreCase)
                ? NotFound(message)
                : BadRequest(message);
        }

        var item = result.ResultObject!;
        var countryName = await localityCatalog.TryGetCountryNameAsync(item.CountryCode);
        string? regionName = null;
        if (!string.IsNullOrEmpty(item.StateOrProvinceCode))
        {
            regionName = await localityCatalog.TryGetRegionNameAsync(
                item.CountryCode, item.StateOrProvinceCode);
        }

        // Fetch tax group if assigned
        string? taxGroupName = null;
        decimal? taxGroupPercentage = null;
        if (item.ShippingTaxGroupId.HasValue)
        {
            var taxGroup = await taxService.GetTaxGroup(item.ShippingTaxGroupId.Value, ct);
            taxGroupName = taxGroup?.Name;
            taxGroupPercentage = taxGroup?.TaxPercentage;
        }

        return Ok(new ShippingTaxOverrideDto
        {
            Id = item.Id,
            CountryCode = item.CountryCode,
            StateOrProvinceCode = item.StateOrProvinceCode,
            ShippingTaxGroupId = item.ShippingTaxGroupId,
            ShippingTaxGroupName = taxGroupName,
            ShippingTaxGroupPercentage = taxGroupPercentage,
            CountryName = countryName,
            RegionName = regionName,
            DateCreated = item.DateCreated,
            DateUpdated = item.DateUpdated
        });
    }

    /// <summary>
    /// Delete a shipping tax override
    /// </summary>
    [HttpDelete("shipping-tax-overrides/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var result = await taxService.DeleteShippingTaxOverrideAsync(id, ct);
        if (!result.Successful)
        {
            var message = result.Messages.FirstOrDefault()?.Message ?? "Failed to delete shipping tax override.";
            return message.Contains("not found", StringComparison.OrdinalIgnoreCase)
                ? NotFound(message)
                : BadRequest(message);
        }

        return NoContent();
    }
}
