# Starter Site Walkthrough

The `Merchello.Site` project is a working example store that shows you how to build a storefront with Merchello. Whether you used the .NET template or cloned the repo, this guide walks you through every piece so you understand how it all fits together.

## Overview

The starter site is deliberately simple -- it is a bare-bones example showing the key integration points. It uses Umbraco's standard MVC patterns (route hijacking via `SurfaceController`) and demonstrates:

- Rendering a homepage with best-selling products
- A category page with filtering, sorting, and pagination
- A basket/cart page
- Product detail pages (handled by Merchello's built-in routing)

## Project Layout

```
Merchello.Site/
  Home/
    Controllers/HomeController.cs
  Basket/
    Controllers/BasketController.cs
  Category/
    Controllers/CategoryController.cs
    Models/CategoryPageViewModel.cs
  Shared/
    Controllers/BaseController.cs
  Views/
    Home.cshtml
    Basket.cshtml
    Category.cshtml
    Website.cshtml              # Layout
    Products/
      Default.cshtml            # Product detail
      Partials/
        _ProductGallery.cshtml
        _ProductPurchasePanel.cshtml
        _ProductUpsells.cshtml
```

## The Base Controller

All site controllers inherit from `BaseController`, which extends Umbraco's `SurfaceController` and implements `IRenderController`:

```csharp
public class BaseController(
    IUmbracoContextAccessor umbracoContextAccessor,
    IUmbracoDatabaseFactory databaseFactory,
    ServiceContext services,
    AppCaches appCaches,
    IProfilingLogger profilingLogger,
    IPublishedUrlProvider publishedUrlProvider)
    : SurfaceController(/* ... */), IRenderController
{
    protected ActionResult CurrentTemplate<T>(T model, string viewName = "")
    {
        if (string.IsNullOrEmpty(viewName))
        {
            viewName = ControllerContext.RouteData.Values["action"]?.ToString();
        }
        return View(viewName, model);
    }
}
```

This gives you Umbraco's route hijacking -- when a content node uses a document type, the matching controller action is called automatically. The `CurrentTemplate` helper resolves the correct view.

## HomeController

The homepage shows best-selling products using Merchello's reporting service:

```csharp
public class HomeController(
    /* Umbraco dependencies */,
    IReportingService reportingService)
    : BaseController(/* ... */)
{
    public async Task<IActionResult> Home(Home model)
    {
        model.BestSellers = await reportingService.GetBestSellersAsync(take: 8);
        return CurrentTemplate(model);
    }
}
```

Key points:
- The controller injects `IReportingService` from Merchello
- `GetBestSellersAsync(take: 8)` queries the top 8 best-selling products by order volume
- The model is the Umbraco published content model (`Home`), and the best sellers are added as a property

## BasketController

The basket page loads the customer's current basket and maps it for display:

```csharp
public class BasketController(
    IOptions<MerchelloSettings> options,
    ICheckoutService checkoutService,
    IStorefrontContextService storefrontContext,
    IStorefrontDtoMapper storefrontDtoMapper,
    /* Umbraco dependencies */)
    : BaseController(/* ... */)
{
    public async Task<IActionResult> Basket(Basket model, CancellationToken cancellationToken)
    {
        var basket = await checkoutService.GetBasket(
            new GetBasketParameters(), cancellationToken);
        var displayContext = await storefrontContext.GetDisplayContextAsync(cancellationToken);

        if (basket == null || basket.LineItems.Count == 0)
        {
            ViewBag.BasketData = storefrontDtoMapper.MapBasket(
                null, displayContext, _settings.CurrencySymbol);
        }
        else
        {
            var availability = await storefrontContext
                .GetBasketAvailabilityAsync(basket.LineItems, ct: cancellationToken);
            ViewBag.BasketData = storefrontDtoMapper.MapBasket(
                basket, displayContext, _settings.CurrencySymbol, availability);
        }

        return CurrentTemplate(model);
    }
}
```

Key concepts:
- **`ICheckoutService.GetBasket()`** retrieves the current customer's basket from their session
- **`IStorefrontContextService.GetDisplayContextAsync()`** provides display information (currency symbol, exchange rate, tax settings, decimal places)
- **`IStorefrontDtoMapper.MapBasket()`** converts the basket into a display-ready DTO with formatted prices
- **Availability check** -- `GetBasketAvailabilityAsync()` verifies stock and shipping availability for each line item

> **Tip:** The display context handles multi-currency and tax-inclusive pricing automatically. You do not need to calculate these yourself.

## CategoryController

The category page demonstrates querying products with filtering, sorting, and pagination:

```csharp
public class CategoryController(
    /* Umbraco dependencies */,
    IProductService productService,
    IProductFilterService productFilterService)
    : BaseController(/* ... */)
{
    private const int PageSize = 12;

    public async Task<IActionResult> Category(
        Category model,
        [FromQuery] List<Guid>? filterKeys = null,
        [FromQuery] decimal? minPrice = null,
        [FromQuery] decimal? maxPrice = null,
        [FromQuery] ProductOrderBy orderBy = ProductOrderBy.PriceAsc,
        [FromQuery] int page = 1)
    {
        // Get the collection from the Umbraco property
        var collections = model.Value<IEnumerable<ProductCollection>>("collection");
        var collection = collections?.FirstOrDefault();

        if (collection == null)
        {
            model.ViewModel = new CategoryPageViewModel();
            return CurrentTemplate(model);
        }

        // Get price range for slider bounds
        var priceRange = await productService.GetPriceRangeForCollection(collection.Id);

        // Build query
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

        var products = await productService.QueryProducts(parameters);
        var filterGroups = await productFilterService
            .GetFilterGroupsForCollection(collection.Id);

        model.ViewModel = new CategoryPageViewModel
        {
            Products = products,
            FilterGroups = filterGroups,
            SelectedFilterKeys = filterKeys ?? [],
            CollectionId = collection.Id,
            // ... price range, sort, pagination
        };

        return CurrentTemplate(model);
    }
}
```

Key concepts:
- **Collections** are linked to Umbraco content via an Umbraco property picker (the `"collection"` property)
- **`ProductQueryParameters`** is a flexible query object supporting collection filtering, price ranges, product filters, sorting, and pagination
- **`ProductOrderBy`** supports `PriceAsc`, `PriceDesc`, `NameAsc`, `NameDesc`, and more
- **`ProductAvailabilityFilter.Available`** ensures only in-stock, purchasable products are returned
- **Filter groups** (`IProductFilterService.GetFilterGroupsForCollection()`) returns only filters relevant to products in this collection, so you do not show empty filter options

## Product Pages

Product pages are different from the other pages -- they do not need an Umbraco content node. Merchello handles product routing automatically.

When a request comes in for a URL like `/mesh-office-chair`, Merchello's `ProductContentFinder` looks up the `ProductRoot` by its `RootUrl`. If found, it creates a `MerchelloPublishedProduct` (a virtual `IPublishedContent`) and the `MerchelloProductController` renders the appropriate view.

You do not write a controller for product pages. Instead, you create Razor views in `~/Views/Products/`. See the [Product Routing](../products/product-routing.md) and [Building Product Views](../products/product-views.md) guides for full details.

The starter site includes `Default.cshtml` which demonstrates:
- Image gallery with variant-specific images
- Price display with tax and multi-currency support
- Variant option selectors (color swatches, size dropdowns)
- Add-on options with price adjustments
- Stock availability display
- Schema.org structured data
- SEO meta tags
- Add to cart functionality

## Views

### Website.cshtml (Layout)

The layout wraps all pages with a consistent header, navigation, and footer. All page views reference it via `Layout = "~/Views/Website.cshtml"`.

### Home.cshtml

Renders the homepage content and loops through the `BestSellers` list to show product cards.

### Basket.cshtml

Reads the basket data from `ViewBag.BasketData` (set by `BasketController`) and renders line items with quantities, prices, and a checkout link.

### Category.cshtml

Uses the `CategoryPageViewModel` to render a product grid with sidebar filters (color, size, etc.), price range slider, sort dropdown, and pagination.

## How to Extend

The starter site is meant to be a starting point, not a finished store. Here are common ways to extend it:

1. **Add new page types** -- create new Umbraco document types and matching controllers that inject Merchello services
2. **Customize product views** -- create new `.cshtml` files in `~/Views/Products/` and set the `ViewAlias` on product roots in the backoffice
3. **Add customer pages** -- inject `ICustomerService` to build account pages with order history
4. **Style the checkout** -- the integrated checkout supports theme customization via store settings

## Next Steps

- [Product Routing](../products/product-routing.md) -- how products render without content nodes
- [Building Product Views](../products/product-views.md) -- creating custom product templates
- [Products Overview](../products/products-overview.md) -- understand the product data model
