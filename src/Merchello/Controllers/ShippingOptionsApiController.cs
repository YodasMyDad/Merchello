using Asp.Versioning;
using Merchello.Core.Shipping.Dtos;
using Merchello.Core.Shipping.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class ShippingOptionsApiController(
    IShippingOptionService service) : MerchelloApiControllerBase
{
    #region Shipping Options

    /// <summary>
    /// Get all shipping options
    /// </summary>
    [HttpGet("shipping-options")]
    [ProducesResponseType<List<ShippingOptionDto>>(StatusCodes.Status200OK)]
    public async Task<List<ShippingOptionDto>> GetAll(CancellationToken ct)
    {
        return await service.GetAllAsync(ct);
    }

    /// <summary>
    /// Get shipping option by ID with costs and weight tiers
    /// </summary>
    [HttpGet("shipping-options/{id:guid}")]
    [ProducesResponseType<ShippingOptionDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var option = await service.GetByIdAsync(id, ct);
        return option == null ? NotFound() : Ok(option);
    }

    /// <summary>
    /// Create a new shipping option
    /// </summary>
    [HttpPost("shipping-options")]
    [ProducesResponseType<ShippingOptionDetailDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateShippingOptionDto dto, CancellationToken ct)
    {
        var result = await service.CreateAsync(dto, ct);
        if (!result.Successful)
        {
            return BadRequest(result.Messages.FirstOrDefault()?.Message ?? "Failed to create shipping option.");
        }

        var detail = await service.GetByIdAsync(result.ResultObject!.Id, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.ResultObject.Id }, detail);
    }

    /// <summary>
    /// Update a shipping option
    /// </summary>
    [HttpPut("shipping-options/{id:guid}")]
    [ProducesResponseType<ShippingOptionDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateShippingOptionDto dto, CancellationToken ct)
    {
        var result = await service.UpdateAsync(id, dto, ct);
        if (!result.Successful)
        {
            var errorMessage = result.Messages.FirstOrDefault()?.Message;
            if (errorMessage?.Contains("not found") == true)
            {
                return NotFound(errorMessage);
            }
            return BadRequest(errorMessage ?? "Failed to update shipping option.");
        }

        var detail = await service.GetByIdAsync(id, ct);
        return Ok(detail);
    }

    /// <summary>
    /// Delete a shipping option
    /// </summary>
    [HttpDelete("shipping-options/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var result = await service.DeleteAsync(id, ct);
        if (!result.Successful)
        {
            var errorMessage = result.Messages.FirstOrDefault()?.Message;
            if (errorMessage?.Contains("not found") == true)
            {
                return NotFound(errorMessage);
            }
            return BadRequest(errorMessage ?? "Failed to delete shipping option.");
        }

        return NoContent();
    }

    #endregion

    #region Shipping Costs

    /// <summary>
    /// Add a cost to a shipping option
    /// </summary>
    [HttpPost("shipping-options/{optionId:guid}/costs")]
    [ProducesResponseType<ShippingCostDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AddCost(Guid optionId, [FromBody] CreateShippingCostDto dto, CancellationToken ct)
    {
        var result = await service.AddCostAsync(optionId, dto, ct);
        if (!result.Successful)
        {
            return BadRequest(result.Messages.FirstOrDefault()?.Message ?? "Failed to add shipping cost.");
        }

        var cost = result.ResultObject!;
        return Created($"/api/v1/shipping-costs/{cost.Id}", new ShippingCostDto
        {
            Id = cost.Id,
            CountryCode = cost.CountryCode,
            StateOrProvinceCode = cost.StateOrProvinceCode,
            Cost = cost.Cost
        });
    }

    /// <summary>
    /// Update a shipping cost
    /// </summary>
    [HttpPut("shipping-costs/{costId:guid}")]
    [ProducesResponseType<ShippingCostDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateCost(Guid costId, [FromBody] CreateShippingCostDto dto, CancellationToken ct)
    {
        var result = await service.UpdateCostAsync(costId, dto, ct);
        if (!result.Successful)
        {
            var errorMessage = result.Messages.FirstOrDefault()?.Message;
            if (errorMessage?.Contains("not found") == true)
            {
                return NotFound(errorMessage);
            }
            return BadRequest(errorMessage ?? "Failed to update shipping cost.");
        }

        var cost = result.ResultObject!;
        return Ok(new ShippingCostDto
        {
            Id = cost.Id,
            CountryCode = cost.CountryCode,
            StateOrProvinceCode = cost.StateOrProvinceCode,
            Cost = cost.Cost
        });
    }

    /// <summary>
    /// Delete a shipping cost
    /// </summary>
    [HttpDelete("shipping-costs/{costId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteCost(Guid costId, CancellationToken ct)
    {
        var result = await service.DeleteCostAsync(costId, ct);
        if (!result.Successful)
        {
            return NotFound();
        }

        return NoContent();
    }

    #endregion

    #region Weight Tiers

    /// <summary>
    /// Add a weight tier to a shipping option
    /// </summary>
    [HttpPost("shipping-options/{optionId:guid}/weight-tiers")]
    [ProducesResponseType<ShippingWeightTierDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AddWeightTier(Guid optionId, [FromBody] CreateShippingWeightTierDto dto, CancellationToken ct)
    {
        var result = await service.AddWeightTierAsync(optionId, dto, ct);
        if (!result.Successful)
        {
            return BadRequest(result.Messages.FirstOrDefault()?.Message ?? "Failed to add weight tier.");
        }

        var tier = result.ResultObject!;
        return Created($"/api/v1/shipping-weight-tiers/{tier.Id}", new ShippingWeightTierDto
        {
            Id = tier.Id,
            CountryCode = tier.CountryCode,
            StateOrProvinceCode = tier.StateOrProvinceCode,
            MinWeightKg = tier.MinWeightKg,
            MaxWeightKg = tier.MaxWeightKg,
            Surcharge = tier.Surcharge
        });
    }

    /// <summary>
    /// Update a weight tier
    /// </summary>
    [HttpPut("shipping-weight-tiers/{tierId:guid}")]
    [ProducesResponseType<ShippingWeightTierDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateWeightTier(Guid tierId, [FromBody] CreateShippingWeightTierDto dto, CancellationToken ct)
    {
        var result = await service.UpdateWeightTierAsync(tierId, dto, ct);
        if (!result.Successful)
        {
            var errorMessage = result.Messages.FirstOrDefault()?.Message;
            if (errorMessage?.Contains("not found") == true)
            {
                return NotFound(errorMessage);
            }
            return BadRequest(errorMessage ?? "Failed to update weight tier.");
        }

        var tier = result.ResultObject!;
        return Ok(new ShippingWeightTierDto
        {
            Id = tier.Id,
            CountryCode = tier.CountryCode,
            StateOrProvinceCode = tier.StateOrProvinceCode,
            MinWeightKg = tier.MinWeightKg,
            MaxWeightKg = tier.MaxWeightKg,
            Surcharge = tier.Surcharge
        });
    }

    /// <summary>
    /// Delete a weight tier
    /// </summary>
    [HttpDelete("shipping-weight-tiers/{tierId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteWeightTier(Guid tierId, CancellationToken ct)
    {
        var result = await service.DeleteWeightTierAsync(tierId, ct);
        if (!result.Successful)
        {
            return NotFound();
        }

        return NoContent();
    }

    #endregion
}
