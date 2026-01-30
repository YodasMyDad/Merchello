using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Products.Services.Parameters;
using Merchello.Site.Category.Models;
using Merchello.Site.Shared.Controllers;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Core.Cache;
using Umbraco.Cms.Core.Logging;
using Umbraco.Cms.Core.Routing;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Web;
using Umbraco.Cms.Infrastructure.Persistence;

namespace Merchello.Site.Category.Controllers;

public class CategoryController(
    IUmbracoContextAccessor umbracoContextAccessor,
    IUmbracoDatabaseFactory databaseFactory,
    ServiceContext services,
    AppCaches appCaches,
    IProfilingLogger profilingLogger,
    IPublishedUrlProvider publishedUrlProvider,
    IProductService productService,
    IProductFilterService productFilterService)
    : BaseController(umbracoContextAccessor, databaseFactory, services, appCaches, profilingLogger,
        publishedUrlProvider)
{
    private const int PageSize = 12;

    public async Task<IActionResult> Category(
        Umbraco.Cms.Web.Common.PublishedModels.Category model,
        [FromQuery] List<Guid>? filterKeys = null,
        [FromQuery] decimal? minPrice = null,
        [FromQuery] decimal? maxPrice = null,
        [FromQuery] ProductOrderBy orderBy = ProductOrderBy.PriceAsc,
        [FromQuery] int page = 1)
    {
        // Get the collection from the Umbraco property
        //var collections = model.Value<IEnumerable<ProductCollection>>("collection");
        var collections = model.Value<IEnumerable<ProductCollection>>("collection");
        var collection = collections?.FirstOrDefault();

        if (collection == null)
        {
            // No collection assigned - return empty view model
            model.ViewModel = new CategoryPageViewModel();
            return CurrentTemplate(model);
        }

        // Get the available price range for this collection (for the slider bounds)
        var priceRange = await productService.GetPriceRangeForCollection(collection.Id);

        // Build query parameters
        var parameters = new ProductQueryParameters
        {
            CollectionIds = [collection.Id],
            FilterKeys = filterKeys,
            MinPrice = minPrice,
            MaxPrice = maxPrice,
            OrderBy = orderBy,
            CurrentPage = page,
            AmountPerPage = PageSize,
            NoTracking = true,
            AvailabilityFilter = ProductAvailabilityFilter.Available
        };

        // Query products
        var products = await productService.QueryProducts(parameters);

        // Get only filter groups that have products in this collection
        var filterGroups = await productFilterService.GetFilterGroupsForCollection(collection.Id);

        // Build view model
        model.ViewModel = new CategoryPageViewModel
        {
            Products = products,
            FilterGroups = filterGroups,
            SelectedFilterKeys = filterKeys ?? [],
            CollectionId = collection.Id,
            CollectionName = collection.Name,
            MinPrice = minPrice,
            MaxPrice = maxPrice,
            PriceRangeMin = priceRange.MinPrice,
            PriceRangeMax = priceRange.MaxPrice,
            OrderBy = orderBy,
            CurrentPage = page,
            PageSize = PageSize
        };

        return CurrentTemplate(model);
    }
}
