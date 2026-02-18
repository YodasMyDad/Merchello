using Asp.Versioning;
using Merchello.Core.ProductFeeds.Dtos;
using Merchello.Core.ProductFeeds.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class ProductFeedsApiController(
    IProductFeedService productFeedService) : MerchelloApiControllerBase
{
    [HttpGet("product-feeds")]
    [ProducesResponseType<List<ProductFeedListItemDto>>(StatusCodes.Status200OK)]
    public async Task<List<ProductFeedListItemDto>> GetFeeds(CancellationToken ct)
    {
        return await productFeedService.GetFeedsAsync(ct);
    }

    [HttpGet("product-feeds/{id:guid}")]
    [ProducesResponseType<ProductFeedDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetFeed(Guid id, CancellationToken ct)
    {
        var feed = await productFeedService.GetFeedAsync(id, ct);
        if (feed == null)
        {
            return NotFound();
        }

        return Ok(feed);
    }

    [HttpPost("product-feeds")]
    [ProducesResponseType<ProductFeedDetailDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateFeed([FromBody] CreateProductFeedDto request, CancellationToken ct)
    {
        var result = await productFeedService.CreateFeedAsync(request, ct);
        if (CrudErrors(result) is { } error)
        {
            return error;
        }

        return CreatedAtAction(nameof(GetFeed), new { id = result.ResultObject!.Id }, result.ResultObject);
    }

    [HttpPut("product-feeds/{id:guid}")]
    [ProducesResponseType<ProductFeedDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateFeed(Guid id, [FromBody] UpdateProductFeedDto request, CancellationToken ct)
    {
        var result = await productFeedService.UpdateFeedAsync(id, request, ct);
        if (CrudErrors(result) is { } error)
        {
            return error;
        }

        return Ok(result.ResultObject);
    }

    [HttpDelete("product-feeds/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteFeed(Guid id, CancellationToken ct)
    {
        var result = await productFeedService.DeleteFeedAsync(id, ct);
        if (CrudError(result) is { } error)
        {
            return error;
        }

        return NoContent();
    }

    [HttpPost("product-feeds/{id:guid}/rebuild")]
    [ProducesResponseType<ProductFeedRebuildResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Rebuild(Guid id, CancellationToken ct)
    {
        var result = await productFeedService.RebuildAsync(id, ct);
        if (result == null)
        {
            return NotFound();
        }

        return Ok(result);
    }

    [HttpGet("product-feeds/{id:guid}/preview")]
    [ProducesResponseType<ProductFeedPreviewDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Preview(Guid id, CancellationToken ct)
    {
        var preview = await productFeedService.PreviewAsync(id, ct);
        if (preview == null)
        {
            return NotFound();
        }

        return Ok(preview);
    }

    [HttpPost("product-feeds/{id:guid}/validate")]
    [ProducesResponseType<ProductFeedValidationDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Validate(Guid id, [FromBody] ValidateProductFeedDto request, CancellationToken ct)
    {
        var validation = await productFeedService.ValidateAsync(id, request, ct);
        if (validation == null)
        {
            return NotFound();
        }

        return Ok(validation);
    }

    [HttpGet("product-feeds/resolvers")]
    [ProducesResponseType<List<ProductFeedResolverDescriptorDto>>(StatusCodes.Status200OK)]
    public async Task<List<ProductFeedResolverDescriptorDto>> GetResolvers(CancellationToken ct)
    {
        return await productFeedService.GetResolversAsync(ct);
    }
}
