using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.PublishedCache;

namespace Merchello.Site.Shared.Components.ProductBox;

public class ProductBoxViewComponent(
    IProductService productService,
    IPublishedMediaCache mediaCache) : ViewComponent
{
    public async Task<IViewComponentResult> InvokeAsync(Product product)
    {
        ArgumentNullException.ThrowIfNull(product);

        // Get the first image GUID for this product
        var imageDict = await productService.GetProductImagesAsync([product.Id]);
        var imageGuid = imageDict.GetValueOrDefault(product.Id);

        // Resolve GUID to actual media URL
        string? imageUrl = null;
        if (!string.IsNullOrEmpty(imageGuid) && Guid.TryParse(imageGuid, out var guid))
        {
            var media = mediaCache.GetById(guid);
            if (media != null)
            {
                imageUrl = media.GetCropUrl(width: 400, height: 400);
            }
        }

        var model = new ProductBoxViewModel
        {
            ProductId = product.Id,
            Name = product.ProductRoot?.RootName ?? product.Name ?? "Unknown Product",
            Price = product.Price,
            PreviousPrice = product.OnSale ? product.PreviousPrice : null,
            OnSale = product.OnSale,
            ImageUrl = imageUrl,
            ProductUrl = product.ProductRoot?.RootUrl != null
                ? $"/{product.ProductRoot.RootUrl}"
                : $"/products/{product.Id}"
        };

        return View(model);
    }
}
