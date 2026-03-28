# Product Filters

Product filters let your customers narrow down product listings using faceted browsing -- think "Size", "Colour", or "Material" checkboxes on a category page. Merchello organises filters into **filter groups** (the facet headings) containing individual **filters** (the selectable values).

## How It Works

Filters are a two-level hierarchy:

- **Filter Group** -- a named category like "Colour" or "Size", with a sort order.
- **Filter** -- a value within a group like "Red", "Blue", or "Large". Filters can optionally carry a hex colour swatch and/or an image.

You assign filters to individual product variants. When a customer selects filters on a category page, the product query returns only variants that match.

## Setting Up Filters (Backoffice API)

All filter management goes through `IProductFilterService`, exposed via the `FiltersApiController` at the backoffice API base route.

### Create a Filter Group

```csharp
// Service layer
var result = await productFilterService.CreateFilterGroup("Colour", cancellationToken);
if (result.Success)
{
    var group = result.ResultObject; // ProductFilterGroup with Id, Name, SortOrder
}
```

**API:** `POST /filter-groups` with body `{ "name": "Colour" }`

### Create Filters Within a Group

```csharp
var result = await productFilterService.CreateFilter(new CreateFilterParameters
{
    FilterGroupId = colourGroupId,
    Name = "Red",
    HexColour = "#FF0000",  // Optional: colour swatch
    Image = mediaGuid       // Optional: Umbraco media key
}, cancellationToken);
```

**API:** `POST /filter-groups/{groupId}/filters` with body `{ "name": "Red", "hexColour": "#FF0000" }`

### Assign Filters to a Product

This replaces all existing filter assignments for the product with the new set:

```csharp
await productFilterService.AssignFiltersToProduct(
    productId,
    [redFilterId, largeFilterId],
    cancellationToken);
```

**API:** `PUT /products/{productId}/filters` with body `{ "filterIds": ["guid1", "guid2"] }`

### Get Filters for a Product

```csharp
var filters = await productFilterService.GetFiltersForProduct(productId, cancellationToken);
// Returns List<ProductFilter> with Id, Name, HexColour, Image, SortOrder
```

**API:** `GET /products/{productId}/filters`

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

Here is a simplified version of how the `.Site` project builds a category page with filters:

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

## Managing Sort Order

Both filter groups and filters within a group support custom ordering.

### Reorder Groups

```csharp
// Pass an ordered list of group IDs -- sort order is set by position
await productFilterService.ReorderFilterGroups(
    [groupId1, groupId2, groupId3],
    cancellationToken);
```

**API:** `PUT /filter-groups/reorder` with body `["guid1", "guid2", "guid3"]`

### Reorder Filters Within a Group

```csharp
await productFilterService.ReorderFilters(
    groupId,
    [filterId1, filterId2, filterId3],
    cancellationToken);
```

**API:** `PUT /filter-groups/{groupId}/filters/reorder` with body `["guid1", "guid2", "guid3"]`

## API Reference

All endpoints are under the Merchello backoffice API versioned route.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/filter-groups` | List all filter groups with filters |
| `GET` | `/filter-groups/{id}` | Get a single filter group |
| `POST` | `/filter-groups` | Create a filter group |
| `PUT` | `/filter-groups/{id}` | Update a filter group |
| `DELETE` | `/filter-groups/{id}` | Delete a filter group and all its filters |
| `PUT` | `/filter-groups/reorder` | Reorder filter groups |
| `POST` | `/filter-groups/{groupId}/filters` | Create a filter in a group |
| `GET` | `/filters/{id}` | Get a single filter |
| `PUT` | `/filters/{id}` | Update a filter |
| `DELETE` | `/filters/{id}` | Delete a filter |
| `PUT` | `/filter-groups/{groupId}/filters/reorder` | Reorder filters in a group |
| `PUT` | `/products/{productId}/filters` | Assign filters to a product |
| `GET` | `/products/{productId}/filters` | Get filters for a product |

## Key Points

- Filters are **many-to-many** with products -- one product can have multiple filters, and one filter can belong to multiple products.
- `AssignFiltersToProduct` is a **replace** operation -- it clears all existing assignments and sets the new ones.
- Deleting a filter group also deletes all filters within it.
- Deleting a filter automatically removes it from any product assignments.
- Use `GetFilterGroupsForCollection` on category pages to avoid showing irrelevant empty filter groups.
