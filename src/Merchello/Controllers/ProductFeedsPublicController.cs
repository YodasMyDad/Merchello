using Merchello.Core.ProductFeeds.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Api.Common.Attributes;

namespace Merchello.Controllers;

[ApiController]
[Route("api/merchello/feeds")]
[ApiExplorerSettings(GroupName = Core.Constants.StorefrontApiName)]
[MapToApi(Core.Constants.StorefrontApiName)]
public class ProductFeedsPublicController(
    IProductFeedService productFeedService) : ControllerBase
{
    [HttpGet("{slug}.xml")]
    [Produces("application/xml")]
    public async Task<IActionResult> GetProductsFeed(string slug, CancellationToken ct)
    {
        var xml = await productFeedService.GetProductsXmlAsync(slug, ct);
        if (string.IsNullOrWhiteSpace(xml))
        {
            return NotFound();
        }

        return Content(xml, "application/xml; charset=utf-8");
    }

    [HttpGet("{slug}/promotions.xml")]
    [Produces("application/xml")]
    public async Task<IActionResult> GetPromotionsFeed(string slug, CancellationToken ct)
    {
        var xml = await productFeedService.GetPromotionsXmlAsync(slug, ct);
        if (string.IsNullOrWhiteSpace(xml))
        {
            return NotFound();
        }

        return Content(xml, "application/xml; charset=utf-8");
    }
}
