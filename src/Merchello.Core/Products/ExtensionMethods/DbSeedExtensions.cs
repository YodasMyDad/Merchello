using Merchello.Core.Accounting.Models;
using Merchello.Core.Data;
using Merchello.Core.Products.Factories;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Warehouses.Models;

namespace Merchello.Core.Products.ExtensionMethods;

/// <summary>
/// Extension methods for database seeding - helps create products with variants
/// </summary>
public static class ProductServiceDbSeedExtensions
{
    /// <summary>
    /// Creates a product root with auto-generated variants from colors and sizes.
    /// This is a helper method specifically for database seeding scenarios.
    /// Adds the product to the context but does NOT save - caller must call SaveChangesAsync.
    /// </summary>
    public static CrudResult<ProductRoot> CreateProductRootWithVariants(
        this MerchelloDbContext context,
        ProductFactory productFactory,
        string name,
        string? description,
        decimal price,
        TaxGroup taxGroup,
        ProductType productType,
        List<ProductCategory>? categories = null,
        decimal? weight = null,
        List<string>? images = null,
        List<string>? sellingPoints = null,
        string? googleShoppingCategory = null,
        string[]? colors = null,
        string[]? sizes = null,
        List<ProductFilter>? colorFilters = null,
        List<ProductFilter>? sizeFilters = null,
        List<(Warehouse warehouse, int priority)>? warehouses = null,
        List<(int warehouseIndex, int minStock, int maxStock, bool trackStock)>? warehouseStockRanges = null,
        decimal costOfGoodsPercentage = 0.4m)
    {
        var result = new CrudResult<ProductRoot>();
        var random = new Random(42); // Fixed seed for reproducibility

        // Create product root
        var productRoot = new ProductRoot
        {
            Id = Guid.NewGuid(),
            RootName = name,
            RootUrl = name.ToLower().Replace(" ", "-"),
            TaxGroup = taxGroup,
            TaxGroupId = taxGroup.Id,
            ProductType = productType,
            ProductTypeId = productType.Id,
            RootImages = images ?? [],
            SellingPoints = sellingPoints ?? [],
            GoogleShoppingFeedCategory = googleShoppingCategory,
            DefaultPackageConfigurations = weight.HasValue
                ? [new ProductPackage { Weight = weight.Value }]
                : []
        };

        // Add categories
        if (categories != null)
        {
            foreach (var category in categories)
            {
                productRoot.Categories.Add(category);
            }
        }

        // Create product options if colors/sizes specified
        if (colors != null && colors.Length > 0)
        {
            var colorOption = new ProductOption
            {
                Id = Guid.NewGuid(),
                Name = "Color",
                Alias = "color",
                SortOrder = 1,
                OptionTypeAlias = "color",
                OptionUiAlias = "dropdown",
                ProductOptionValues = colors.Select((c, i) => new ProductOptionValue
                {
                    Id = Guid.NewGuid(),
                    Name = c,
                    FullName = c,
                    SortOrder = i
                }).ToList()
            };
            productRoot.ProductOptions.Add(colorOption);
        }

        if (sizes != null && sizes.Length > 0)
        {
            var sizeOption = new ProductOption
            {
                Id = Guid.NewGuid(),
                Name = "Size",
                Alias = "size",
                SortOrder = 2,
                OptionTypeAlias = "size",
                OptionUiAlias = "dropdown",
                ProductOptionValues = sizes.Select((s, i) => new ProductOptionValue
                {
                    Id = Guid.NewGuid(),
                    Name = s,
                    FullName = s,
                    SortOrder = i
                }).ToList()
            };
            productRoot.ProductOptions.Add(sizeOption);
        }

        // Add warehouse associations
        if (warehouses != null)
        {
            foreach (var (warehouse, priority) in warehouses)
            {
                productRoot.ProductRootWarehouses.Add(new ProductRootWarehouse
                {
                    ProductRootId = productRoot.Id,
                    WarehouseId = warehouse.Id,
                    PriorityOrder = priority
                });
            }
        }

        // Generate variants
        var costOfGoods = price * costOfGoodsPercentage;
        var colorArray = colors ?? ["Default"];
        var sizeArray = sizes ?? ["Default"];
        var variantIndex = 0;

        foreach (var color in colorArray)
        {
            foreach (var size in sizeArray)
            {
                var variantName = BuildVariantName(name, color, size);
                var variantKey = (color != "Default" || size != "Default")
                    ? $"{color.ToLower()}-{size.ToLower()}"
                    : null;
                var sku = GenerateSku(name, color, size);

                var product = productFactory.Create(
                    productRoot,
                    variantName,
                    price,
                    costOfGoods,
                    string.Empty, // gtin
                    sku,
                    variantIndex == 0, // isDefault
                    variantKey
                );

                product.AvailableForPurchase = true;
                product.Images = [$"https://prd.place/600/800?seed={product.Id}"];
                // Packages are inherited from ProductRoot.DefaultPackageConfigurations

                // Add filters
                if (color != "Default" && colorFilters != null)
                {
                    var colorFilter = colorFilters.FirstOrDefault(f => f.Name == color);
                    if (colorFilter != null)
                        product.Filters.Add(colorFilter);
                }

                if (size != "Default" && sizeFilters != null)
                {
                    var sizeFilter = sizeFilters.FirstOrDefault(f => f.Name == size);
                    if (sizeFilter != null)
                        product.Filters.Add(sizeFilter);
                }

                // Add stock for each warehouse
                if (warehouses != null && warehouseStockRanges != null)
                {
                    foreach (var (warehouseIndex, minStock, maxStock, trackStock) in warehouseStockRanges)
                    {
                        if (warehouseIndex < warehouses.Count)
                        {
                            var warehouse = warehouses[warehouseIndex].warehouse;
                            var stock = random.Next(minStock, maxStock + 1);
                            var reorderPoint = trackStock ? Math.Max(5, (int)(maxStock * 0.25)) : (int?)null;

                            var productWarehouse = new ProductWarehouse
                            {
                                ProductId = product.Id,
                                WarehouseId = warehouse.Id,
                                Stock = stock,
                                TrackStock = trackStock,
                                ReorderPoint = reorderPoint,
                                ReorderQuantity = trackStock ? (maxStock - minStock) : null
                            };

                            product.ProductWarehouses.Add(productWarehouse);
                            // Explicitly add to context to ensure EF Core tracks it
                            context.ProductWarehouses.Add(productWarehouse);
                        }
                    }
                }

                productRoot.Products.Add(product);
                variantIndex++;
            }
        }

        // Add to context (caller must call SaveChangesAsync)
        context.RootProducts.Add(productRoot);

        result.ResultObject = productRoot;

        return result;
    }

    private static string BuildVariantName(string rootName, string color, string size)
    {
        List<string> parts = [rootName];
        if (color != "Default") parts.Add(color);
        if (size != "Default") parts.Add(size);
        return string.Join(" - ", parts);
    }

    private static string GenerateSku(string rootName, string color, string size)
    {
        var prefix = rootName.Substring(0, Math.Min(3, rootName.Length)).ToUpper();
        List<string> parts = ["PRD", prefix];

        if (color != "Default")
            parts.Add(color.Substring(0, Math.Min(3, color.Length)).ToUpper());

        if (size != "Default")
            parts.Add(size.ToUpper());

        return string.Join("-", parts);
    }
}

