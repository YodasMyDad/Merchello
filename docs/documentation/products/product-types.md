# Product Types

Product types let you categorise your products into logical groups like "Clothing", "Electronics", or "Gift Cards". They are simple labels with an auto-generated URL-friendly alias, useful for filtering and organisation in the backoffice and on the storefront.

## How It Works

Each product type has three properties:

- **Id** -- a unique GUID.
- **Name** -- the display name (e.g. "Clothing").
- **Alias** -- auto-generated URL slug from the name (e.g. "clothing"). This is created using `SlugHelper` and must be unique.

Product types are assigned to product roots. You can query products by product type using `ProductQueryParameters`.

## Service API

All product type management is through `IProductTypeService`.

### Create a Product Type

```csharp
var result = await productTypeService.CreateProductType("Clothing", cancellationToken);

if (result.Success)
{
    var productType = result.ResultObject;
    // productType.Name  = "Clothing"
    // productType.Alias = "clothing"  (auto-generated)
}
```

The alias is auto-generated from the name. If a product type with the same alias already exists, the operation returns an error.

### Update a Product Type

```csharp
var result = await productTypeService.UpdateProductType(
    productTypeId,
    "Apparel",  // new name
    cancellationToken);

// Alias is regenerated: "apparel"
```

When you update the name, the alias is regenerated. The service checks that the new alias does not conflict with another existing product type.

### Delete a Product Type

```csharp
var result = await productTypeService.DeleteProductType(productTypeId, cancellationToken);

if (!result.Success)
{
    // "Cannot delete product type 'Clothing' because it is assigned to 3 product(s)"
}
```

> **Warning:** You cannot delete a product type that is currently assigned to any products. Unassign it from all products first.

### List All Product Types

```csharp
var types = await productTypeService.GetProductTypes(cancellationToken);
// Returns List<ProductType> ordered by Name
```

### Get Product Types by IDs

For batch loading (e.g. in value converters):

```csharp
var types = await productTypeService.GetProductTypesByIds(
    [typeId1, typeId2],
    cancellationToken);
```

## Querying Products by Type

Use `ProductQueryParameters` to filter products by product type:

```csharp
// By product type GUID
var parameters = new ProductQueryParameters
{
    ProductTypeKey = productTypeId
};

// By multiple type GUIDs
var parameters = new ProductQueryParameters
{
    ProductTypeKeys = [typeId1, typeId2]
};

// By alias string
var parameters = new ProductQueryParameters
{
    ProductTypeAlias = "clothing"
};

var products = await productService.QueryProducts(parameters);
```

## Key Points

- Product types are simple name/alias pairs -- they do not carry additional configuration.
- Aliases are auto-generated from names and must be unique across all product types.
- You cannot delete a product type that is in use by products.
- Product types are returned sorted alphabetically by name.
