# Product Filters

Product filters let your customers narrow down product listings using faceted browsing -- think "Size", "Colour", or "Material" checkboxes on a category page. Merchello organises filters into **filter groups** (the facet headings) containing individual **filters** (the selectable values).

## How It Works

Filters are a two-level hierarchy:

- **Filter Group** -- a named category like "Colour" or "Size", with a sort order.
- **Filter** -- a value within a group like "Red", "Blue", or "Large". Filters can optionally carry a hex colour swatch and/or an image.

You assign filters to individual product variants in the backoffice. When a customer selects filters on a category page, the product query returns only variants that match.

## Querying Products with Filters

When building a category page, pass selected filter IDs to `ProductQueryParameters.FilterKeys`:

```csharp
var parameters = new ProductQueryParameters
{
    CollectionIds = [collectionId],
    FilterKeys = selectedFilterIds,   // List<Guid> of selected filter IDs
    MinPrice = minPrice,
    MaxPrice = maxPrice,
    OrderBy = ProductOrderBy.PriceAsc,
    CurrentPage = page,
    AmountPerPage = 12,
    AvailabilityFilter = ProductAvailabilityFilter.Available
};

var products = await productService.QueryProducts(parameters);
```

## Collection-Scoped Filter Groups

On a category page you typically only want to show filter groups that are relevant to the products in that collection. The `GetFilterGroupsForCollection` method handles this -- it returns only groups that have at least one filter assigned to a purchasable product in the collection:

```csharp
// Only returns groups with relevant filters -- empty groups are excluded
var filterGroups = await productFilterService.GetFilterGroupsForCollection(
    collectionId,
    cancellationToken);
```

This is the method used by the `.Site` example project's `CategoryController`.

## Real-World Example: Category Page

The starter site's [CategoryController.cs](../../../src/Merchello.Site/Category/Controllers/CategoryController.cs) accepts filter selections from query parameters, queries products, and loads the relevant filter groups:

```csharp
public async Task<IActionResult> Category(
    Category model,
    [FromQuery] List<Guid>? filterKeys = null,
    [FromQuery] decimal? minPrice = null,
    [FromQuery] decimal? maxPrice = null,
    [FromQuery] ProductOrderBy orderBy = ProductOrderBy.PriceAsc,
    [FromQuery] int page = 1)
{
    var collection = model.Value<IEnumerable<ProductCollection>>("collection")?.FirstOrDefault();
    if (collection == null) return CurrentTemplate(model);

    // Get price range for slider bounds
    var priceRange = await productService.GetPriceRangeForCollection(collection.Id);

    // Query products with active filters
    var products = await productService.QueryProducts(new ProductQueryParameters
    {
        CollectionIds = [collection.Id],
        FilterKeys = filterKeys,
        MinPrice = minPrice,
        MaxPrice = maxPrice,
        OrderBy = orderBy,
        CurrentPage = page,
        AmountPerPage = 12,
        AvailabilityFilter = ProductAvailabilityFilter.Available
    });

    // Get only relevant filter groups for this collection
    var filterGroups = await productFilterService.GetFilterGroupsForCollection(collection.Id);

    model.ViewModel = new CategoryPageViewModel
    {
        Products = products,
        FilterGroups = filterGroups,
        SelectedFilterKeys = filterKeys ?? [],
        PriceRangeMin = priceRange.MinPrice,
        PriceRangeMax = priceRange.MaxPrice
    };

    return CurrentTemplate(model);
}
```

## Rendering Filters in a View

The starter site uses a [ProductFiltersViewComponent](../../../src/Merchello.Site/Shared/Components/ProductFilters/ProductFiltersViewComponent.cs) with the view at [Views/Shared/Components/ProductFilters/Default.cshtml](../../../src/Merchello.Site/Views/Shared/Components/ProductFilters/Default.cshtml). The component receives the filter groups and selected keys, then renders checkboxes (or colour swatches for colour groups):

```html
@model ProductFiltersViewModel

@if (Model.FilterGroups.Any())
{
    <div class="product-filters">
        <h5 class="mb-3">Filters</h5>

        @foreach (var group in Model.FilterGroups.OrderBy(g => g.SortOrder))
        {
            <div class="filter-group mb-4">
                <h6 class="fw-bold mb-2">@group.Name</h6>

                <div class="filter-options">
                    @foreach (var filter in group.Filters.OrderBy(f => f.SortOrder))
                    {
                        <div class="form-check mb-2">
                            <input class="form-check-input"
                                   type="checkbox"
                                   id="filter-@filter.Id"
                                   value="@filter.Id"
                                   @(Model.SelectedFilterKeys.Contains(filter.Id) ? "checked" : "")>
                            <label class="form-check-label" for="filter-@filter.Id">
                                @filter.Name
                            </label>
                        </div>
                    }
                </div>
            </div>
        }
    </div>
}
```

Filters with a `HexColour` value can be rendered as colour swatches instead of checkboxes. The `.Site` project checks if all filters in a group have a hex colour and switches to a swatch grid layout.

Invoke the view component from your category page:

```html
@await Component.InvokeAsync("ProductFilters", new
{
    filterGroups = Model.ViewModel.FilterGroups,
    selectedFilterKeys = Model.ViewModel.SelectedFilterKeys
})
```

## Key Services

| Service | Method | Purpose |
| ------- | ------ | ------- |
| `IProductService` | `QueryProducts(ProductQueryParameters)` | Query products with filter, price, and availability criteria |
| `IProductService` | `GetPriceRangeForCollection(Guid)` | Get min/max price for a collection (useful for price slider bounds) |
| `IProductFilterService` | `GetFilterGroupsForCollection(Guid)` | Get filter groups relevant to a specific collection |

## Key Points

- Filters are **many-to-many** with products -- one product can have multiple filters, and one filter can belong to multiple products.
- Filter groups and filters are created and managed in the backoffice.
- Use `GetFilterGroupsForCollection` on category pages to avoid showing irrelevant empty filter groups.
- Filter selections are passed as `List<Guid>` via query string parameters, making URLs shareable and bookmarkable.
