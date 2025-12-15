using Asp.Versioning;
using Merchello.Core.Products.Dtos;
using Merchello.Core.Products.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

/// <summary>
/// API controller for product filter management
/// </summary>
[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class FiltersApiController(IProductService productService) : MerchelloApiControllerBase
{
    /// <summary>
    /// Get all filter groups with their filters
    /// </summary>
    [HttpGet("filter-groups")]
    [ProducesResponseType<List<ProductFilterGroupDto>>(StatusCodes.Status200OK)]
    public async Task<List<ProductFilterGroupDto>> GetFilterGroups(CancellationToken ct)
    {
        var groups = await productService.GetFilterGroups(ct);
        return groups
            .OrderBy(g => g.SortOrder)
            .Select(MapGroupToDto)
            .ToList();
    }

    /// <summary>
    /// Get a single filter group by ID
    /// </summary>
    [HttpGet("filter-groups/{id:guid}")]
    [ProducesResponseType<ProductFilterGroupDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetFilterGroup(Guid id, CancellationToken ct)
    {
        var filterGroup = await productService.GetFilterGroup(id, ct);
        if (filterGroup == null)
        {
            return NotFound();
        }

        return Ok(MapGroupToDto(filterGroup));
    }

    /// <summary>
    /// Create a new filter group
    /// </summary>
    [HttpPost("filter-groups")]
    [ProducesResponseType<ProductFilterGroupDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateFilterGroup([FromBody] CreateFilterGroupDto dto, CancellationToken ct)
    {
        var result = await productService.CreateFilterGroup(dto.Name, ct);
        if (!result.Successful)
        {
            return BadRequest(result.Messages.FirstOrDefault()?.Message ?? "Failed to create filter group.");
        }

        var filterGroup = result.ResultObject!;
        var filterGroupDto = MapGroupToDto(filterGroup);

        return Created($"/api/v1/filter-groups/{filterGroup.Id}", filterGroupDto);
    }

    /// <summary>
    /// Update an existing filter group
    /// </summary>
    [HttpPut("filter-groups/{id:guid}")]
    [ProducesResponseType<ProductFilterGroupDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateFilterGroup(Guid id, [FromBody] UpdateFilterGroupDto dto, CancellationToken ct)
    {
        var result = await productService.UpdateFilterGroup(id, dto.Name, dto.SortOrder, ct);

        if (!result.Successful)
        {
            var message = result.Messages.FirstOrDefault()?.Message ?? "Failed to update filter group.";
            return message.Contains("not found", StringComparison.OrdinalIgnoreCase)
                ? NotFound(message)
                : BadRequest(message);
        }

        return Ok(MapGroupToDto(result.ResultObject!));
    }

    /// <summary>
    /// Delete a filter group
    /// </summary>
    [HttpDelete("filter-groups/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteFilterGroup(Guid id, CancellationToken ct)
    {
        var result = await productService.DeleteFilterGroup(id, ct);
        if (!result.Successful)
        {
            var errorMessage = result.Messages.FirstOrDefault()?.Message;
            if (errorMessage?.Contains("not found", StringComparison.OrdinalIgnoreCase) == true)
            {
                return NotFound(errorMessage);
            }
            return BadRequest(errorMessage ?? "Failed to delete filter group.");
        }

        return NoContent();
    }

    /// <summary>
    /// Reorder filter groups
    /// </summary>
    [HttpPut("filter-groups/reorder")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ReorderFilterGroups([FromBody] List<Guid> orderedIds, CancellationToken ct)
    {
        var result = await productService.ReorderFilterGroups(orderedIds, ct);
        if (!result.Successful)
        {
            return BadRequest(result.Messages.FirstOrDefault()?.Message ?? "Failed to reorder filter groups.");
        }

        return Ok();
    }

    /// <summary>
    /// Create a new filter within a group
    /// </summary>
    [HttpPost("filter-groups/{groupId:guid}/filters")]
    [ProducesResponseType<ProductFilterDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateFilter(Guid groupId, [FromBody] CreateFilterDto dto, CancellationToken ct)
    {
        var result = await productService.CreateFilter(groupId, dto.Name, dto.HexColour, dto.Image, ct);
        if (!result.Successful)
        {
            var message = result.Messages.FirstOrDefault()?.Message ?? "Failed to create filter.";
            return message.Contains("not found", StringComparison.OrdinalIgnoreCase)
                ? NotFound(message)
                : BadRequest(message);
        }

        var filter = result.ResultObject!;
        var filterDto = MapFilterToDto(filter);

        return Created($"/api/v1/filters/{filter.Id}", filterDto);
    }

    /// <summary>
    /// Get a single filter by ID
    /// </summary>
    [HttpGet("filters/{id:guid}")]
    [ProducesResponseType<ProductFilterDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetFilter(Guid id, CancellationToken ct)
    {
        var filter = await productService.GetFilter(id, ct);
        if (filter == null)
        {
            return NotFound();
        }

        return Ok(MapFilterToDto(filter));
    }

    /// <summary>
    /// Update a filter
    /// </summary>
    [HttpPut("filters/{id:guid}")]
    [ProducesResponseType<ProductFilterDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateFilter(Guid id, [FromBody] UpdateFilterDto dto, CancellationToken ct)
    {
        var result = await productService.UpdateFilter(id, dto.Name, dto.HexColour, dto.Image, dto.SortOrder, ct);

        if (!result.Successful)
        {
            var message = result.Messages.FirstOrDefault()?.Message ?? "Failed to update filter.";
            return message.Contains("not found", StringComparison.OrdinalIgnoreCase)
                ? NotFound(message)
                : BadRequest(message);
        }

        return Ok(MapFilterToDto(result.ResultObject!));
    }

    /// <summary>
    /// Delete a filter
    /// </summary>
    [HttpDelete("filters/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteFilter(Guid id, CancellationToken ct)
    {
        var result = await productService.DeleteFilter(id, ct);
        if (!result.Successful)
        {
            var errorMessage = result.Messages.FirstOrDefault()?.Message;
            if (errorMessage?.Contains("not found", StringComparison.OrdinalIgnoreCase) == true)
            {
                return NotFound(errorMessage);
            }
            return BadRequest(errorMessage ?? "Failed to delete filter.");
        }

        return NoContent();
    }

    /// <summary>
    /// Reorder filters within a group
    /// </summary>
    [HttpPut("filter-groups/{groupId:guid}/filters/reorder")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ReorderFilters(Guid groupId, [FromBody] List<Guid> orderedIds, CancellationToken ct)
    {
        var result = await productService.ReorderFilters(groupId, orderedIds, ct);
        if (!result.Successful)
        {
            return BadRequest(result.Messages.FirstOrDefault()?.Message ?? "Failed to reorder filters.");
        }

        return Ok();
    }

    /// <summary>
    /// Assign filters to a product (replaces existing assignments)
    /// </summary>
    [HttpPut("products/{productId:guid}/filters")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AssignFiltersToProduct(Guid productId, [FromBody] AssignFiltersDto dto, CancellationToken ct)
    {
        var result = await productService.AssignFiltersToProduct(productId, dto.FilterIds, ct);

        if (!result.Successful)
        {
            var message = result.Messages.FirstOrDefault()?.Message ?? "Failed to assign filters.";
            return message.Contains("not found", StringComparison.OrdinalIgnoreCase)
                ? NotFound(message)
                : BadRequest(message);
        }

        return Ok();
    }

    /// <summary>
    /// Get filters assigned to a product
    /// </summary>
    [HttpGet("products/{productId:guid}/filters")]
    [ProducesResponseType<List<ProductFilterDto>>(StatusCodes.Status200OK)]
    public async Task<List<ProductFilterDto>> GetFiltersForProduct(Guid productId, CancellationToken ct)
    {
        var filters = await productService.GetFiltersForProduct(productId, ct);
        return filters.Select(MapFilterToDto).ToList();
    }

    private static ProductFilterGroupDto MapGroupToDto(Core.Products.Models.ProductFilterGroup group)
    {
        return new ProductFilterGroupDto
        {
            Id = group.Id,
            Name = group.Name ?? "Unnamed",
            SortOrder = group.SortOrder,
            Filters = group.Filters
                .OrderBy(f => f.SortOrder)
                .Select(MapFilterToDto)
                .ToList()
        };
    }

    private static ProductFilterDto MapFilterToDto(Core.Products.Models.ProductFilter filter)
    {
        return new ProductFilterDto
        {
            Id = filter.Id,
            Name = filter.Name ?? "Unnamed",
            SortOrder = filter.SortOrder,
            HexColour = filter.HexColour,
            Image = filter.Image,
            FilterGroupId = filter.ProductFilterGroupId,
            ProductCount = filter.Products?.Count ?? 0
        };
    }
}
