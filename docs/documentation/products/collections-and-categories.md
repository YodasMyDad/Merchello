# Product Collections

Collections are how you organize products into groups in Merchello. They serve as categories, allowing you to build browsable catalog pages like "T-Shirts", "Office Furniture", or "Sale Items". A product can belong to multiple collections, and collections can be linked to Umbraco content nodes for rendering category pages.

## The ProductCollection Model

The model is straightforward:

```csharp
public class ProductCollection
{
    public Guid Id { get; set; }
    public string? Name { get; set; }
    public ICollection<ProductRoot> Products { get; set; }
}
```

Collections are simple named groups. A product root can belong to many collections, and a collection can contain many product roots (many-to-many relationship).

## Creating Collections

### Via the Backoffice

Collections are managed in the Merchello backoffice. You can create, rename, and delete collections, and assign products to them.

### Via Code

Use `IProductCollectionService`:

```csharp
public class MyService(IProductCollectionService collectionService)
{
    public async Task CreateCollectionAsync(CancellationToken ct)
    {
        var result = await collectionService.CreateProductCollection("Summer Sale", ct);

        if (result.Success)
        {
            var collection = result.ResultObject;
            // Collection created with Id = collection.Id
        }
    }
}
```

The service provides:
- `CreateProductCollection(name)` -- create a new collection
- `UpdateProductCollection(id, name)` -- rename a collection
- Methods for adding/removing products to/from collections

## Querying Products by Collection

The main way to query products in a collection is through `IProductService.QueryProducts()` with the `CollectionIds` parameter:

```csharp
var products = await productService.QueryProducts(new ProductQueryParameters
{
    CollectionIds = [collectionId],
    CurrentPage = 1,
    AmountPerPage = 12,
    OrderBy = ProductOrderBy.PriceAsc,
    AvailabilityFilter = ProductAvailabilityFilter.Available,
    NoTracking = true
});
```

You can also combine collection filtering with other criteria:

```csharp
var products = await productService.QueryProducts(new ProductQueryParameters
{
    CollectionIds = [collectionId],
    FilterKeys = selectedFilters,      // Product filter values
    MinPrice = 10m,                    // Price range
    MaxPrice = 100m,
    OrderBy = ProductOrderBy.PriceDesc,
    CurrentPage = page,
    AmountPerPage = 12,
    NoTracking = true
});
```

### Available Sort Options

The `ProductOrderBy` enum provides these sort options:

- `PriceAsc` / `PriceDesc`
- `NameAsc` / `NameDesc`
- And other sorting criteria

### Availability Filtering

Use `ProductAvailabilityFilter` to control which products appear:

- `Available` -- only in-stock, purchasable products
- Other values for different availability states

## Building Category Pages

The starter site demonstrates the recommended pattern for category pages in [CategoryController.cs](../../../src/Merchello.Site/Category/Controllers/CategoryController.cs) and the [Category.cshtml view](../../../src/Merchello.Site/Views/Category.cshtml). Here is how it works:

### Step 1: Create an Umbraco Document Type

Create a document type called "Category" with a property that picks a Merchello collection. The collection picker is configured as an Umbraco property editor.

### Step 2: Create the Controller

```csharp
public class CategoryController(
    IProductService productService,
    IProductFilterService productFilterService,
    /* Umbraco dependencies */)
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
        // Get collection from Umbraco property
        var collections = model.Value<IEnumerable<ProductCollection>>("collection");
        var collection = collections?.FirstOrDefault();

        if (collection == null)
        {
            model.ViewModel = new CategoryPageViewModel();
            return CurrentTemplate(model);
        }

        // Get price range for the collection (for UI slider bounds)
        var priceRange = await productService.GetPriceRangeForCollection(collection.Id);

        // Query products with all filters applied
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

        // Get filter groups relevant to this collection
        var filterGroups = await productFilterService
            .GetFilterGroupsForCollection(collection.Id);

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
```

### Step 3: Create the View

The `Category.cshtml` view renders the product grid, filter sidebar, and pagination.

## Product Filters

For the full filter API and UI rendering pattern, see [Product Filters](./product-filters.md). A short summary:

Product filters are separate from collections but work closely with them. Filters are organized into **filter groups** (like "Color" or "Size"), each containing individual **filter values** (like "Red", "Blue", "Large").

Variants can be assigned to filter values, enabling faceted navigation. The key methods are:

- `productFilterService.GetFilterGroupsForCollection(collectionId)` -- returns only filter groups that have products in the given collection (no empty filters)
- `productService.QueryProducts()` with `FilterKeys` -- filters results to products matching the selected filter values

### How Filters Relate to Collections

When you call `GetFilterGroupsForCollection(collectionId)`, you get back only the filter groups and values that are actually relevant to products in that collection. This prevents showing a "Size" filter on a collection of non-sized products, for example.

## Price Range Queries

For building price range sliders or filter UI, use:

```csharp
var priceRange = await productService.GetPriceRangeForCollection(collectionId);
// priceRange.MinPrice -- lowest price in the collection
// priceRange.MaxPrice -- highest price in the collection
```

This gives you the bounds for a price slider without loading all products.

## Assigning Products to Collections

Products are assigned to collections at the `ProductRoot` level (not the variant level). When you assign a product to a collection, all its variants are implicitly in that collection.

```csharp
// When creating a product root:
var createResult = await productService.CreateProductRoot(new CreateProductRootDto
{
    RootName = "Classic T-Shirt",
    CollectionIds = [collectionId1, collectionId2], // Assign to collections
    // ... other properties
}, cancellationToken);
```

## Multiple Collections per Product

Products can belong to multiple collections simultaneously. For example, a "Blue T-Shirt" might be in:

- "T-Shirts" (product type collection)
- "Summer Sale" (promotional collection)
- "New Arrivals" (temporal collection)
- "Under $30" (price-based collection)

This is purely organizational -- the product data is not duplicated.

## Next Steps

- [Products Overview](./products-overview.md) -- the full product data model
- [Starter Site Walkthrough](../getting-started/starter-site-walkthrough.md) -- see the category page in action
- [Variants and Options](./variants-and-options.md) -- how filters relate to variant options
