# Products Overview

Products in Merchello use a two-level hierarchy: **ProductRoot** and **Product** (variant). Understanding this relationship is fundamental to working with the product system, whether you are creating products, building views, or querying the catalog.

## ProductRoot vs Product

### ProductRoot (The Parent)

A `ProductRoot` represents the conceptual product -- "Mesh Office Chair" or "Classic T-Shirt". It holds everything that is shared across all variants:

```csharp
public class ProductRoot
{
    public Guid Id { get; set; }
    public string? RootName { get; set; }              // "Mesh Office Chair"
    public string? RootUrl { get; set; }               // "mesh-office-chair"
    public string? Description { get; set; }            // Rich text description
    public Guid TaxGroupId { get; set; }               // Tax classification
    public Guid ProductTypeId { get; set; }            // Product type (category)
    public bool IsDigitalProduct { get; set; }          // No physical shipping
    public bool AllowExternalCarrierShipping { get; set; } = true;

    // SEO
    public string? MetaDescription { get; set; }
    public string? PageTitle { get; set; }
    public string? CanonicalUrl { get; set; }
    public bool NoIndex { get; set; }

    // Display
    public List<string> RootImages { get; set; } = [];
    public string? ViewAlias { get; set; }             // "Default", "Gallery", etc.
    public string? ElementTypeAlias { get; set; }      // Umbraco Element Type
    public string? ElementPropertyData { get; set; }   // Custom property values

    // Shipping
    public List<ProductPackage> DefaultPackageConfigurations { get; set; } = [];

    // Collections
    public List<ProductOption> ProductOptions { get; set; } = [];
    public ICollection<ProductCollection> Collections { get; set; } = [];
    public ICollection<ProductRootWarehouse> ProductRootWarehouses { get; set; } = [];
    public ICollection<Product> Products { get; set; } = []; // The variants

    // Extended
    public Dictionary<string, object> ExtendedData { get; set; } = [];
}
```

### Product (The Variant)

A `Product` represents a specific purchasable SKU -- "Mesh Office Chair - Blue / Large". Each product root has at least one product (the default variant):

```csharp
public class Product
{
    public Guid Id { get; set; }
    public Guid ProductRootId { get; set; }
    public bool Default { get; set; }                  // Is this the default variant?

    // Identity
    public string? Name { get; set; }                  // "Blue / Large"
    public string? Sku { get; set; }                   // "MESH-CHAIR-BLU-LG"
    public string? Url { get; set; }                   // "blue-large"
    public string? VariantOptionsKey { get; set; }     // Comma-separated option value IDs

    // Pricing
    public decimal Price { get; set; }                 // Selling price (net)
    public decimal CostOfGoods { get; set; }           // Internal cost
    public decimal? PreviousPrice { get; set; }        // Strike-through price
    public bool OnSale { get; set; }                   // Sale flag

    // Availability
    public bool AvailableForPurchase { get; set; } = true;
    public bool CanPurchase { get; set; } = true;

    // Media
    public List<string> Images { get; set; } = [];
    public bool ExcludeRootProductImages { get; set; }

    // Stock
    public ICollection<ProductWarehouse> ProductWarehouses { get; set; } = [];
    public int TotalStock => ProductWarehouses?.Sum(pw => pw.Stock) ?? 0;

    // Shipping
    public ShippingRestrictionMode ShippingRestrictionMode { get; set; }
    public ICollection<ShippingOption> AllowedShippingOptions { get; set; } = [];
    public ICollection<ShippingOption> ExcludedShippingOptions { get; set; } = [];
    public List<ProductPackage> PackageConfigurations { get; set; } = [];
}
```

## What Lives Where

| Concern | ProductRoot | Product (Variant) |
|---------|-------------|-------------------|
| Name | `RootName` (product name) | `Name` (variant name, e.g., "Blue / Large") |
| URL | `RootUrl` (base URL slug) | `Url` (variant path segment) |
| Price | -- | `Price`, `PreviousPrice`, `OnSale` |
| SKU | -- | `Sku` |
| Stock | -- | Per-warehouse via `ProductWarehouses` |
| Tax Group | `TaxGroupId` | Inherited from root |
| Product Type | `ProductTypeId` | Inherited from root |
| Collections | `Collections` | Inherited from root |
| Description | `Description` | -- |
| Images | `RootImages` (shared) | `Images` (variant-specific) |
| SEO | `MetaDescription`, `PageTitle`, etc. | -- |
| Options | `ProductOptions` | `VariantOptionsKey` (identifies which values) |
| Warehouses | `ProductRootWarehouses` (priority) | `ProductWarehouses` (stock levels) |
| Packages | `DefaultPackageConfigurations` | `PackageConfigurations` (overrides root) |

## Product URLs

Products are accessible at root-level URLs without Umbraco content nodes:

- Root product: `/{RootUrl}` -- e.g., `/mesh-office-chair`
- Specific variant: `/{RootUrl}/{VariantUrl}` -- e.g., `/mesh-office-chair/blue-large`

The `RootUrl` is auto-generated from the product name when creating a product root.

## Creating Products

Products are created through `IProductService`. You create the root first, then variants are generated from options:

```csharp
// Step 1: Create the product root with a default variant
var createResult = await productService.CreateProductRoot(new CreateProductRootDto
{
    RootName = "Classic T-Shirt",
    TaxGroupId = taxGroup.Id,
    ProductTypeId = productType.Id,
    CollectionIds = [collectionId],
    WarehouseIds = [warehouseId],
    DefaultVariant = new CreateVariantDto
    {
        Name = "Classic T-Shirt",
        Sku = "CLASSIC-TSHIRT",
        Price = 29.99m,
        CostOfGoods = 12.00m,
        AvailableForPurchase = true,
        CanPurchase = true
    }
}, cancellationToken);

// Step 2: Add options (generates variants automatically)
// See the Variants and Options guide
```

> **Warning:** Never create `ProductRoot` or `Product` entities directly with `new`. Always use `IProductService` methods, which handle slug generation, variant key calculation, and database consistency.

## Tax Groups

Every product root must have a `TaxGroupId`. Tax groups define the tax rate category (e.g., "Standard VAT 20%", "Reduced Rate 5%", "Zero Rate"). The tax group ID flows through to line items and invoices, where tax providers use it to determine the correct rate.

## Product Types

Product types are categories used to classify products (e.g., "T-Shirts", "Office Furniture", "Electronics"). They are created via `IProductTypeService` and assigned when creating a product root.

## Digital Products

When `IsDigitalProduct` is `true`:
- No warehouse assignment or shipping is required
- Digital-only invoices auto-complete after successful payment
- Customer account is required (no guest checkout)
- Download settings are stored in `ExtendedData` using constant keys

## Shipping Restrictions

At the variant level, you can control which shipping options are available:

| Mode | Behavior |
|------|----------|
| `None` | Use base shipping options from warehouses |
| `AllowList` | Only the specified `AllowedShippingOptions` are available |
| `ExcludeList` | Base options minus the `ExcludedShippingOptions` |

Additionally, `AllowExternalCarrierShipping` on the product root controls whether dynamic carrier providers (FedEx, UPS) can quote for this product. When `false`, only flat-rate shipping options are available.

## Images

Images use a layered approach:
- `ProductRoot.RootImages` -- shared images shown for all variants
- `Product.Images` -- variant-specific images (e.g., the blue version)
- `Product.ExcludeRootProductImages` -- when `true`, only variant images are shown (root images are not appended)

Images are stored as Umbraco media keys (GUIDs as strings) and resolved to URLs using `MediaCache` in views.

## Querying Products

Use `IProductService.QueryProducts()` with `ProductQueryParameters` for flexible querying:

```csharp
var results = await productService.QueryProducts(new ProductQueryParameters
{
    CollectionIds = [collectionId],
    FilterKeys = selectedFilters,
    MinPrice = 10m,
    MaxPrice = 100m,
    OrderBy = ProductOrderBy.PriceAsc,
    CurrentPage = 1,
    AmountPerPage = 12,
    AvailabilityFilter = ProductAvailabilityFilter.Available,
    NoTracking = true
});
```

## Next Steps

- [Variants and Options](./variants-and-options.md) -- variant generation and add-on options
- [Product Routing](./product-routing.md) -- how product URLs work
- [Building Product Views](./product-views.md) -- rendering products in Razor
- [Collections](./collections-and-categories.md) -- organizing products
