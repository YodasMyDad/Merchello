using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Factories;
using Merchello.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.Routing;

namespace Merchello.Routing;

/// <summary>
/// Content finder that intercepts product URLs and creates virtual IPublishedContent for Merchello products.
/// Registered after Umbraco's default ContentFinderByUrl so Umbraco content is checked first.
/// </summary>
public class ProductContentFinder(
    IServiceScopeFactory scopeFactory,
    IOptions<MerchelloSettings> settings,
    ILogger<ProductContentFinder> logger) : IContentFinder
{
    /// <summary>
    /// Attempts to find content for the request by matching product URLs.
    /// </summary>
    public async Task<bool> TryFindContent(IPublishedRequestBuilder request)
    {
        var path = request.AbsolutePathDecoded.Trim('/');
        if (string.IsNullOrEmpty(path)) return false;

        var segments = path.Split('/', 2);
        var rootUrl = segments[0];

        // Create scope to access scoped services (IProductService and MerchelloPublishedElementFactory use DbContext)
        using var scope = scopeFactory.CreateScope();
        var productService = scope.ServiceProvider.GetRequiredService<IProductService>();
        var elementFactory = scope.ServiceProvider.GetRequiredService<MerchelloPublishedElementFactory>();

        // Look up ProductRoot by RootUrl
        var productRoot = await productService.GetByRootUrlAsync(rootUrl);
        if (productRoot is null)
        {
            logger.LogDebug("No ProductRoot found for URL: {RootUrl}", rootUrl);
            return false;
        }

        // Resolve variant
        Product? selectedVariant = null;
        if (segments.Length > 1)
        {
            var variantUrl = segments[1];
            selectedVariant = productRoot.Products
                .FirstOrDefault(p => string.Equals(p.Url, variantUrl, StringComparison.OrdinalIgnoreCase));

            if (selectedVariant is null)
            {
                logger.LogDebug("Variant not found: {VariantUrl} for product {ProductRoot}", variantUrl, productRoot.RootName);
                return false;
            }
        }
        else
        {
            selectedVariant = productRoot.Products.FirstOrDefault(p => p.Default)
                             ?? productRoot.Products.FirstOrDefault();
        }

        if (selectedVariant is null)
        {
            logger.LogDebug("No variants found for ProductRoot: {ProductRoot}", productRoot.RootName);
            return false;
        }

        // Create element from stored data if configured
        IPublishedElement? element = null;
        var elementTypeAlias = settings.Value.ProductElementTypeAlias;

        if (!string.IsNullOrEmpty(elementTypeAlias))
        {
            var propertyValues = productService.DeserializeElementProperties(
                productRoot.ElementPropertyData);

            if (propertyValues.Count > 0)
            {
                element = elementFactory.CreateElement(
                    elementTypeAlias,
                    productRoot.Id,
                    propertyValues);

                if (element is null)
                {
                    logger.LogWarning(
                        "Failed to create element for product {ProductId} with type {ElementType}",
                        productRoot.Id, elementTypeAlias);
                }
            }
        }

        // Create the view model first (without the published product)
        // Then create the published product with the element
        var publishedProduct = new MerchelloPublishedProduct(
            productRoot,
            null!, // ViewModel will be set below
            element);

        // Create the view model with the published product for IContentModel.Content
        var viewModel = new MerchelloProductViewModel(publishedProduct, productRoot, selectedVariant);

        // Update the published product's view model (need to create a new instance since ViewModel is init-only)
        publishedProduct = new MerchelloPublishedProduct(productRoot, viewModel, element);

        request.SetPublishedContent(publishedProduct);
        logger.LogDebug("Resolved product: {ProductName}, Variant: {VariantName}",
            productRoot.RootName, selectedVariant.Name ?? "default");

        return true;
    }
}
