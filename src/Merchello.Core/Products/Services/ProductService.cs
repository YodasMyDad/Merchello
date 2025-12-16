using System.Text.Json;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Data;
using Merchello.Core.Products.Dtos;
using Merchello.Core.Products.Factories;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Parameters;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Products.Extensions;
using Merchello.Core.Products.Mapping;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Warehouses.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.AspNetCore.Mvc.Razor.Compilation;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Products.Services;

public class ProductService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    ProductRootFactory productRootFactory,
    ProductFactory productFactory,
    ProductOptionFactory productOptionFactory,
    SlugHelper slugHelper,
    IContentTypeService contentTypeService,
    ApplicationPartManager partManager,
    IWebHostEnvironment webHostEnvironment,
    IOptions<MerchelloSettings> settings,
    ILogger<ProductService> logger) : IProductService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };
    /// <summary>
    /// Updates a product root
    /// </summary>
    /// <param name="productRoot"></param>
    /// <returns></returns>
    public async Task<CrudResult<ProductRoot>> Update(ProductRoot productRoot)
    {
        var result = new CrudResult<ProductRoot>();
        using var scope = efCoreScopeProvider.CreateScope();

        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            // First product root
            var productRootDb = await db.RootProducts
                .Include(x => x.Categories)
                .Include(x => x.ProductType)
                .Include(x => x.ProductRootWarehouses)
                .Include(x => x.TaxGroup)
                .AsSplitQuery()
                .FirstOrDefaultAsync(x => x.Id == productRoot.Id);

            if (productRootDb == null)
            {
                result.AddErrorMessage("Unable to find the product root with the same id");
                return;
            }

            // If options are empty, check to see if the product DID have variants,
            // if so, grab the first product as a template if request.Product is null
            // Then delete the products and create a single default one
            var products = db.Products.Where(x => x.ProductRootId == productRoot.Id);
            var productsCount = products.Count();

            // Map the data from updated product root to db root (manual mapping)
            productRootDb.CopyFrom(productRoot);

            // Check for change of product type
            if (productRoot.ProductTypeId != productRootDb.ProductTypeId)
            {
                var newProductType = db.ProductTypes.FirstOrDefault(x => x.Id == productRoot.ProductTypeId);
                if (newProductType == null)
                {
                    result.AddErrorMessage("Unable to find new product type");
                    return;
                }

                productRootDb.ProductType = newProductType;
            }

            // Check for change of tax group
            if (productRoot.TaxGroupId != productRootDb.TaxGroupId)
            {
                var newTaxGroup = db.TaxGroups.FirstOrDefault(x => x.Id == productRoot.TaxGroupId);
                if (newTaxGroup == null)
                {
                    result.AddErrorMessage("Unable to find new tax group");
                    return;
                }

                productRootDb.TaxGroup = newTaxGroup;
            }

            // Note: Warehouse changes are handled through the ProductRootWarehouses junction table
            // and should be managed separately via the WarehouseService

            var variantOptions = productRootDb.ProductOptions.Where(o => o.IsVariant).ToList();
            if (!variantOptions.Any())
            {
                if (productsCount > 1)
                {
                    // Need to delete and keep one of the variants which
                    // will now be the new single default
                    var productDb = products.FirstOrDefault(x => x.Default);

                    result.AddWarningMessage(
                        $"Options removed, so removing {productsCount} products from {productRootDb.RootName} and turning it into a single product");

                    // Explicitly cleanup ProductWarehouse records for products being deleted
                    // (cascade delete should handle this, but being explicit for clarity)
                    var productsToDelete = products.Where(x => x.Id != productDb!.Id).ToList();
                    foreach (var product in productsToDelete)
                    {
                        db.Products.Remove(product);
                    }

                    // Map over the properties passed in
                    productDb!.Default = true;

                    // Set the variant name
                    productDb.Name = productRootDb.RootName;

                    // Remove the variant key
                    productDb.VariantOptionsKey = null;
                }
            }
            else
            {
                // We have options, need to check if we are changing from a single product to multiple variants
                if (productsCount > 1)
                {
                    // We have variants already
                    // we need to filter out the products to update, delete and add
                    var updateOptionChoices = variantOptions.Select(option => option.ProductOptionValues);
                    var updatedResults = updateOptionChoices.CartesianObjects().ToList();
                    var updatedVariantIds = updatedResults.CreateVariantIds();

                    var originalIds = products
                        .Select(x => x.VariantOptionsKey)
                        .Where(x => x != null)
                        .ToList()
                        .ToDictionary(x => x!, x => x!);

                    // returns all elements in originalVariantIds that are not in optionItemsNew.
                    var toBeDeleted = originalIds!.Except(updatedVariantIds).Select(x => x.Key);
                    var productsToBeDeleted = products.Where(x => toBeDeleted.Contains(x.VariantOptionsKey)).ToList();
                    var missingDefaultProduct = productsToBeDeleted.Any(x => x.Default);

                    // Remove products - cascade delete will cleanup ProductWarehouse records
                    db.Products.RemoveRange(productsToBeDeleted);

                    // returns all elements in updatedResults that are not in result.
                    var toBeAdded = updatedVariantIds.Except(originalIds!);
                    foreach (var keyValuePair in toBeAdded)
                    {
                        var template = products.FirstOrDefault();

                        var p = productFactory.Create(productRootDb, $"{productRootDb.RootName} - {keyValuePair.Value}",
                            template!.Price,
                            template.CostOfGoods, template.Gtin ?? "", template.Sku ?? "",
                            false, keyValuePair.Key);

                        db.Products.Add(p);
                    }

                    await db.SaveChangesAsyncLogged(logger, result);

                    if (missingDefaultProduct)
                    {
                        // Do a save, then get the products again to check we have a default
                        var updatedProducts = db.Products.Include(x => x.ProductRoot)
                            .Where(x => x.ProductRoot.Id == productRootDb.Id);

                        var firstProduct = updatedProducts.FirstOrDefault();
                        firstProduct!.Default = true;

                        // May not need to call this just update
                        db.Products.Update(firstProduct);
                    }
                }
                else
                {
                    var productTemplate = products.FirstOrDefault();

                    // We are changing from a single product, to variants
                    var duplicateSkus = await CreateVariantsNewAsync(db, productRootDb, productTemplate!.Price, productTemplate.CostOfGoods,
                        productTemplate.Gtin ?? "", productTemplate.Sku ?? "");

                    if (duplicateSkus.Count != 0)
                    {
                        result.AddErrorMessage($"Duplicate SKUs found: {string.Join(", ", duplicateSkus)}");
                        return;
                    }

                    // Delete the initial product - cascade delete will cleanup ProductWarehouse records
                    foreach (var product in products)
                    {
                        db.Products.Remove(product);
                    }
                }
            }

            await db.SaveChangesAsyncLogged(logger, result);
        });

        scope.Complete();
        return result;
    }

    /// <summary>
    /// Creates a new product & product root
    /// </summary>
    public async Task<CrudResult<ProductRoot>> Create(string name, TaxGroup taxGroup, ProductType productType,
        Warehouse warehouse, List<ShippingOption> shippingOptions, decimal price, decimal costOfGoods, string gtin, string sku, List<ProductOption> productOptions)
    {
        var result = new CrudResult<ProductRoot>();
        ProductRoot? productRoot = null;
        using var scope = efCoreScopeProvider.CreateScope();

        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            // Create the product root
            productRoot = productRootFactory.Create(name, taxGroup, productType, warehouse, shippingOptions, productOptions);
            db.RootProducts.Add(productRoot);

            // Are there product options? If so we are creating variants, if not we are creating a single default product
            if (productOptions.Any(o => o.IsVariant))
            {
                var duplicateSkus = await CreateVariantsNewAsync(db, productRoot, price, costOfGoods, gtin, sku);
                if (duplicateSkus.Count != 0)
                {
                    result.AddErrorMessage($"Duplicate SKUs found: {string.Join(", ", duplicateSkus)}");
                    return;
                }
            }
            else
            {
                // Validate SKU uniqueness for single product
                if (!string.IsNullOrEmpty(sku))
                {
                    var skuExists = await db.Products.AnyAsync(p => p.Sku == sku);
                    if (skuExists)
                    {
                        result.AddErrorMessage($"SKU '{sku}' already exists");
                        return;
                    }
                }

                var product = productFactory.Create(productRoot, productRoot.RootName ?? "Missing Root Name", price,
                    costOfGoods, gtin, sku, true);
                db.Products.Add(product);
            }

            // Finally save changes
            await db.SaveChangesAsyncLogged(logger, result);
        });

        scope.Complete();
        result.ResultObject = productRoot;
        return result;
    }

    /// <summary>
    /// Update a product
    /// </summary>
    public async Task<CrudResult<Product>> Update(Product product)
    {
        var result = new CrudResult<Product>();
        using var scope = efCoreScopeProvider.CreateScope();

        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var productDb = await db.Products
                .AsSplitQuery()
                .FirstOrDefaultAsync(x => x.Id == product.Id);

            if (productDb == null)
            {
                result.AddErrorMessage("Unable to find the product root with the same id");
                return;
            }

            productDb.CopyFrom(product);
            await db.SaveChangesAsyncLogged(logger, result);
        });

        scope.Complete();
        result.ResultObject = product;
        return result;
    }

    /// <summary>
    /// Deletes a product root
    /// </summary>
    public async Task<CrudResult<ProductRoot>> Delete(ProductRoot productRoot)
    {
        var result = new CrudResult<ProductRoot>();
        using var scope = efCoreScopeProvider.CreateScope();

        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var toDelete = await db.RootProducts.Include(x => x.Products)
                .AsSplitQuery()
                .FirstOrDefaultAsync(x => x.Id == productRoot.Id);

            if (toDelete != null)
            {
                var collection = toDelete.Products;
                if (collection?.Any() == true)
                {
                    foreach (var product in collection)
                    {
                        db.Products.Remove(product);
                    }
                }
                db.RootProducts.Remove(toDelete);
                await db.SaveChangesAsyncLogged(logger, result);
            }
        });

        scope.Complete();
        return result;
    }

    /// <summary>
    /// Creates a ProductRoot without variants (wizard step 1)
    /// </summary>
    public async Task<CrudResult<ProductRoot>> CreateProductRootOnly(
        string name,
        decimal price,
        decimal costOfGoods,
        decimal weight,
        Guid taxGroupId,
        Guid productTypeId,
        List<Guid> categoryIds,
        string? description = null,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<ProductRoot>();
        ProductRoot? productRoot = null;
        using var scope = efCoreScopeProvider.CreateScope();

        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var taxGroup = await db.TaxGroups.FindAsync([taxGroupId], cancellationToken);
            if (taxGroup == null)
            {
                result.AddErrorMessage("Tax group not found");
                return;
            }

            var productType = await db.ProductTypes.FindAsync([productTypeId], cancellationToken);
            if (productType == null)
            {
                result.AddErrorMessage("Product type not found");
                return;
            }

            var categories = await db.ProductCategories
                .Where(c => categoryIds.Contains(c.Id))
                .ToListAsync(cancellationToken);

            productRoot = new ProductRoot
            {
                Id = Guid.NewGuid(),
                RootName = name,
                RootUrl = slugHelper.GenerateSlug(name),
                TaxGroup = taxGroup,
                TaxGroupId = taxGroupId,
                ProductType = productType,
                ProductTypeId = productTypeId,
                Categories = categories
            };

            // Note: weight parameter will be applied to Product variants when they are created

            db.RootProducts.Add(productRoot);
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
        });

        scope.Complete();
        result.ResultObject = productRoot;
        return result;
    }

    /// <summary>
    /// Adds a product option to an existing ProductRoot
    /// </summary>
    public async Task<CrudResult<ProductOption>> AddProductOption(
        Guid productRootId,
        string name,
        string? alias,
        int sortOrder,
        string? optionTypeAlias,
        string? optionUiAlias,
        bool isVariant,
        List<(string Name, string? FullName, int SortOrder, string? HexValue, decimal PriceAdjustment, decimal CostAdjustment, string? SkuSuffix)> values,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<ProductOption>();
        ProductOption? option = null;
        using var scope = efCoreScopeProvider.CreateScope();

        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var productRoot = await db.RootProducts
                .FirstOrDefaultAsync(pr => pr.Id == productRootId, cancellationToken);

            if (productRoot == null)
            {
                result.AddErrorMessage("Product root not found");
                return;
            }

            option = productOptionFactory.Create(name, alias, sortOrder, optionTypeAlias, optionUiAlias, isVariant, values);
            productRoot.ProductOptions.Add(option);
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
        });

        scope.Complete();
        result.ResultObject = option;
        return result;
    }

    /// <summary>
    /// Removes a product option from an existing ProductRoot
    /// </summary>
    public async Task<CrudResult<bool>> RemoveProductOption(
        Guid productRootId,
        Guid optionId,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();
        using var scope = efCoreScopeProvider.CreateScope();

        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var productRoot = await db.RootProducts
                .FirstOrDefaultAsync(pr => pr.Id == productRootId, cancellationToken);

            if (productRoot == null)
            {
                result.AddErrorMessage("Product root not found");
                return;
            }

            var option = productRoot.ProductOptions.FirstOrDefault(o => o.Id == optionId);
            if (option == null)
            {
                result.AddErrorMessage("Option not found");
                return;
            }

            productRoot.ProductOptions.Remove(option);
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
            result.ResultObject = true;
        });

        scope.Complete();
        return result;
    }

    /// <summary>
    /// Generates variants from ProductRoot options
    /// </summary>
    public async Task<CrudResult<List<Product>>> GenerateVariantsFromOptions(
        Guid productRootId,
        decimal defaultPrice,
        decimal defaultCostOfGoods,
        CancellationToken cancellationToken = default)
    {
        // Delegate to the centralized RegenerateVariants with price/cost overrides
        return await RegenerateVariants(productRootId, defaultPrice, defaultCostOfGoods, cancellationToken);
    }

    /// <summary>
    /// Updates stock levels for a variant at a specific warehouse
    /// </summary>
    public async Task<CrudResult<bool>> UpdateVariantStock(
        Guid variantId,
        Guid warehouseId,
        int stock,
        int? reorderPoint,
        bool trackStock,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();
        using var scope = efCoreScopeProvider.CreateScope();

        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var productWarehouse = await db.ProductWarehouses
                .FirstOrDefaultAsync(pw => pw.ProductId == variantId && pw.WarehouseId == warehouseId, cancellationToken);

            if (productWarehouse == null)
            {
                productWarehouse = new ProductWarehouse
                {
                    ProductId = variantId,
                    WarehouseId = warehouseId,
                    Stock = stock,
                    ReorderPoint = reorderPoint,
                    TrackStock = trackStock
                };
                db.ProductWarehouses.Add(productWarehouse);
            }
            else
            {
                productWarehouse.Stock = stock;
                productWarehouse.ReorderPoint = reorderPoint;
                productWarehouse.TrackStock = trackStock;
            }

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            logger.LogDebug(
                "UpdateVariantStock: Variant {VariantId}, Warehouse {WarehouseId}, Stock {Stock}, TrackStock {TrackStock}",
                variantId, warehouseId, stock, trackStock);

            result.ResultObject = true;
        });

        scope.Complete();
        return result;
    }

    /// <summary>
    /// Applies stock template to all variants of a product root for a specific warehouse
    /// </summary>
    public async Task<CrudResult<bool>> ApplyStockTemplateToAllVariants(
        Guid productRootId,
        Guid warehouseId,
        int defaultStock,
        int? defaultReorderPoint,
        bool trackStock,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();
        List<Product>? variants = null;
        using var scope = efCoreScopeProvider.CreateScope();

        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            variants = await db.Products
                .Where(p => p.ProductRootId == productRootId)
                .ToListAsync(cancellationToken);
        });

        scope.Complete();

        if (variants == null || !variants.Any())
        {
            result.AddErrorMessage("No variants found for this product root");
            return result;
        }

        foreach (var variant in variants)
        {
            var stockResult = await UpdateVariantStock(
                variant.Id,
                warehouseId,
                defaultStock,
                defaultReorderPoint,
                trackStock,
                cancellationToken
            );

            if (!stockResult.Successful)
            {
                result.Messages.AddRange(stockResult.Messages);
                return result;
            }
        }

        result.ResultObject = true;
        return result;
    }

    /// <summary>
    /// Creates a new ProductType with auto-generated slug alias
    /// </summary>
    public async Task<CrudResult<ProductType>> CreateProductType(
        string name,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<ProductType>();
        ProductType? productType = null;
        using var scope = efCoreScopeProvider.CreateScope();

        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var alias = slugHelper.GenerateSlug(name);

            var existingType = await db.ProductTypes
                .FirstOrDefaultAsync(pt => pt.Alias == alias, cancellationToken);

            if (existingType != null)
            {
                result.AddErrorMessage($"A product type with alias '{alias}' already exists");
                return;
            }

            productType = new ProductType
            {
                Id = Guid.NewGuid(),
                Name = name,
                Alias = alias
            };

            db.ProductTypes.Add(productType);
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
        });

        scope.Complete();
        result.ResultObject = productType;
        return result;
    }

    /// <summary>
    /// Updates an existing ProductType
    /// </summary>
    public async Task<CrudResult<ProductType>> UpdateProductType(
        Guid id,
        string name,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<ProductType>();
        ProductType? productType = null;
        using var scope = efCoreScopeProvider.CreateScope();

        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            productType = await db.ProductTypes.FirstOrDefaultAsync(pt => pt.Id == id, cancellationToken);

            if (productType == null)
            {
                result.AddErrorMessage("Product type not found");
                return;
            }

            var newAlias = slugHelper.GenerateSlug(name);

            var existingType = await db.ProductTypes
                .FirstOrDefaultAsync(pt => pt.Alias == newAlias && pt.Id != id, cancellationToken);

            if (existingType != null)
            {
                result.AddErrorMessage($"A product type with alias '{newAlias}' already exists");
                return;
            }

            productType.Name = name;
            productType.Alias = newAlias;

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
        });

        scope.Complete();
        result.ResultObject = productType;
        return result;
    }

    /// <summary>
    /// Deletes a ProductType if it's not in use by any products
    /// </summary>
    public async Task<CrudResult<bool>> DeleteProductType(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();
        using var scope = efCoreScopeProvider.CreateScope();

        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var productType = await db.ProductTypes
                .Include(pt => pt.Products)
                .FirstOrDefaultAsync(pt => pt.Id == id, cancellationToken);

            if (productType == null)
            {
                result.AddErrorMessage("Product type not found");
                return;
            }

            if (productType.Products.Any())
            {
                result.AddErrorMessage($"Cannot delete product type '{productType.Name}' because it is assigned to {productType.Products.Count} product(s)");
                return;
            }

            db.ProductTypes.Remove(productType);
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
            result.ResultObject = true;
        });

        scope.Complete();
        return result;
    }

    /// <summary>
    /// Creates a new ProductCategory
    /// </summary>
    public async Task<CrudResult<ProductCategory>> CreateProductCategory(
        string name,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<ProductCategory>();
        ProductCategory? category = null;
        using var scope = efCoreScopeProvider.CreateScope();

        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            category = new ProductCategory
            {
                Id = Guid.NewGuid(),
                Name = name
            };

            db.ProductCategories.Add(category);
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
        });

        scope.Complete();
        result.ResultObject = category;
        return result;
    }

    /// <summary>
    /// Gets all product types
    /// </summary>
    public async Task<List<ProductType>> GetProductTypes(CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.ProductTypes.AsNoTracking().OrderBy(pt => pt.Name).ToListAsync(cancellationToken));
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Gets all product categories
    /// </summary>
    public async Task<List<ProductCategory>> GetProductCategories(CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.ProductCategories.AsNoTracking().OrderBy(pc => pc.Name).ToListAsync(cancellationToken));
        scope.Complete();
        return result;
    }


    /// <summary>
    /// Creates new variants from the product options.
    /// Validates SKU uniqueness before creating variants.
    /// </summary>
    /// <returns>List of duplicate SKUs if any exist, otherwise empty list</returns>
    private async Task<List<string>> CreateVariantsNewAsync(MerchelloDbContext db, ProductRoot productRoot, decimal price, decimal costOfGoods, string gtin, string baseSku, CancellationToken cancellationToken = default)
    {
        // Create the different versions of the product from the product options
        var variantOptions = productRoot.ProductOptions
            .Where(o => o.IsVariant)
            .Select(option => option.ProductOptionValues)
            .CartesianObjects()
            .ToList();

        // Pre-generate all SKUs to check for duplicates
        var variantData = new List<(IEnumerable<ProductOptionValue> Options, string Name, string Sku)>();
        for (var index = 0; index < variantOptions.Count; index++)
        {
            var variantOption = variantOptions[index];
            var variantKeyName = variantOption.GenerateVariantKeyName();
            var variantName = $"{productRoot.RootName} - {variantKeyName.Name}";
            var variantSku = GenerateVariantSku(variantName, baseSku);
            variantData.Add((variantOption, variantName, variantSku));
        }

        // Check all SKUs for duplicates in the database
        var skusToCheck = variantData.Select(v => v.Sku).ToList();
        var existingSkus = await db.Products
            .Where(p => p.Sku != null && skusToCheck.Contains(p.Sku))
            .Select(p => p.Sku!)
            .ToListAsync(cancellationToken);

        if (existingSkus.Count != 0)
        {
            return existingSkus;
        }

        // No duplicates, create all variants
        for (var index = 0; index < variantData.Count; index++)
        {
            var (options, name, sku) = variantData[index];
            var variantKeyName = options.GenerateVariantKeyName();

            var product = productFactory.Create(productRoot, name, price,
                costOfGoods, gtin, sku,
                index == 0, variantKeyName.Key);
            db.Products.Add(product);
        }

        return [];
    }

    /// <summary>
    /// Generates a unique SKU for a variant based on variant name.
    /// Uses SlugHelper to create a URL-safe, hyphenated format.
    /// SKUs are guaranteed to be unique since variant names are unique.
    /// </summary>
    private string GenerateVariantSku(string variantName, string baseSku)
    {
        // Generate SKU from variant name using SlugHelper for consistent formatting
        var generatedSku = slugHelper.GenerateSlug(variantName).ToUpperInvariant();

        // If a base SKU was provided, prepend it
        if (!string.IsNullOrEmpty(baseSku))
        {
            return $"{baseSku}-{generatedSku}";
        }

        return generatedSku;
    }

    /// <summary>
    /// Gets a product root with optional related data
    /// </summary>
    public async Task<ProductRoot?> GetProductRoot(
        Guid productRootId,
        bool includeProducts = false,
        bool includeWarehouses = false,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            IQueryable<ProductRoot> query = db.RootProducts
                .AsNoTracking()
                .Include(pr => pr.Categories)
                .Include(pr => pr.ProductType)
                .Include(pr => pr.TaxGroup);

            if (includeProducts)
            {
                query = query.Include(pr => pr.Products);
            }

            if (includeWarehouses)
            {
                query = query.Include(pr => pr.ProductRootWarehouses)
                    .ThenInclude(prw => prw.Warehouse);
            }

            return await query.FirstOrDefaultAsync(pr => pr.Id == productRootId, cancellationToken);
        });
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Updates variant shipping restrictions to exclude specific shipping options.
    /// Sets ShippingRestrictionMode to ExcludeList when exclusions provided, otherwise resets to None.
    /// </summary>
    public async Task<CrudResult<bool>> UpdateVariantExcludedShippingOptions(
        Guid variantId,
        List<Guid> excludedShippingOptionIds,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();
        using var scope = efCoreScopeProvider.CreateScope();

        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var variant = await db.Products
                .Include(p => p.ExcludedShippingOptions)
                .FirstOrDefaultAsync(p => p.Id == variantId, cancellationToken);

            if (variant == null)
            {
                result.AddErrorMessage("Variant not found");
                return;
            }

            // Load shipping options to exclude
            var optionsToExclude = await db.ShippingOptions
                .Where(so => excludedShippingOptionIds.Contains(so.Id))
                .ToListAsync(cancellationToken);

            // Update restriction mode
            if (optionsToExclude.Any())
            {
                variant.ShippingRestrictionMode = ShippingRestrictionMode.ExcludeList;
            }
            else
            {
                variant.ShippingRestrictionMode = ShippingRestrictionMode.None;
            }

            // Replace excluded collection
            variant.ExcludedShippingOptions.Clear();
            foreach (var so in optionsToExclude)
            {
                variant.ExcludedShippingOptions.Add(so);
            }

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
            result.ResultObject = true;
        });

        scope.Complete();
        return result;
    }

    /// <summary>
    /// Sets the default variant for a product root, ensuring only one default is set.
    /// </summary>
    public async Task<CrudResult<bool>> SetDefaultVariant(
        Guid variantId,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();
        using var scope = efCoreScopeProvider.CreateScope();

        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            // Find the variant to get its ProductRootId
            var targetVariant = await db.Products
                .FirstOrDefaultAsync(p => p.Id == variantId, cancellationToken);
            
            if (targetVariant == null)
            {
                result.AddErrorMessage("Variant not found");
                return;
            }
            
            // Fetch all variants for that product root
            var siblings = await db.Products
                .Where(p => p.ProductRootId == targetVariant.ProductRootId)
                .ToListAsync(cancellationToken);

            // Update default flags
            foreach (var variant in siblings)
            {
                variant.Default = variant.Id == variantId;
            }

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
            result.ResultObject = true;
        });

        scope.Complete();
        return result;
    }

    /// <summary>
    /// Applies ordering to product query based on OrderBy parameter
    /// </summary>
    private static IQueryable<Product> ApplyOrdering(IQueryable<Product> query, ProductOrderBy orderBy)
    {
        return orderBy switch
        {
            // Cast decimal to double for SQLite compatibility
            ProductOrderBy.PriceAsc => query.OrderBy(p => (double)p.Price),
            ProductOrderBy.PriceDesc => query.OrderByDescending(p => (double)p.Price),
            ProductOrderBy.DateCreated => query.OrderByDescending(p => p.DateCreated),
            ProductOrderBy.DateUpdated => query.OrderByDescending(p => p.DateUpdated),
            ProductOrderBy.ProductRoot => query.OrderBy(p => p.ProductRoot.RootName),
            _ => query.OrderBy(p => p.Name)
        };
    }

    /// <summary>
    /// Updates, adds and removes the categories on the product root
    /// </summary>
    /// <param name="db">Database context</param>
    /// <param name="updatedProductRoot">Updated product root with new categories</param>
    /// <param name="productRootDb">Existing product root from database</param>
    private void UpdateCategories(MerchelloDbContext db, ProductRoot updatedProductRoot, ProductRoot productRootDb)
    {
        if (updatedProductRoot.Categories.Any())
        {
            if (productRootDb.Categories.Any())
            {
                // We have categories, so we need to check which ones to add and remove
                var itemsToRemove = new List<ProductCategory>(
                    productRootDb.Categories.ExceptBy(updatedProductRoot.Categories.Select(x => x.Id), x => x.Id));
                foreach (var productCategory in itemsToRemove)
                {
                    productRootDb.Categories.Remove(productCategory);
                }

                var itemsToAdd =
                    updatedProductRoot.Categories.ExceptBy(productRootDb.Categories.Select(x => x.Id), x => x.Id);
                foreach (var productCategory in itemsToAdd)
                {
                    productRootDb.Categories.Add(productCategory);
                }
            }
            else
            {
                foreach (var productRootCategory in updatedProductRoot.Categories)
                {
                    var dbCat = db.ProductCategories.FirstOrDefault(x => x.Id == productRootCategory.Id);
                    if (dbCat != null)
                    {
                        productRootDb.Categories.Add(dbCat);
                    }
                }
            }
        }
        else
        {
            // Should we use clear? Or should we loop and remove()
            productRootDb.Categories.Clear();
        }
    }



    /// <summary>
    /// Get all product filter groups with their filters
    /// </summary>
    public async Task<List<ProductFilterGroup>> GetFilterGroups(CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.ProductFilterGroups
                .Include(fg => fg.Filters)
                .OrderBy(fg => fg.SortOrder)
                .AsNoTracking()
                .ToListAsync(cancellationToken));
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Get a product category by ID
    /// </summary>
    public async Task<ProductCategory?> GetCategory(Guid categoryId, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.ProductCategories
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == categoryId, cancellationToken));
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Get a single product by ID with configurable includes
    /// </summary>
    public async Task<Product?> GetProduct(GetProductParameters parameters, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            IQueryable<Product> query = db.Products;

            if (parameters.IncludeProductRoot)
            {
                query = query.Include(p => p.ProductRoot);
            }

            if (parameters.IncludeVariants && parameters.IncludeProductRoot)
            {
                query = query.Include(p => p.ProductRoot)
                    .ThenInclude(pr => pr!.Products);

                // If including variants and warehouses, need to include for all variants
                if (parameters.IncludeProductWarehouses)
                {
                    query = query.Include(p => p.ProductRoot)
                        .ThenInclude(pr => pr!.Products)
                            .ThenInclude(p => p.ProductWarehouses);
                }
            }

            if (parameters.IncludeTaxGroup && parameters.IncludeProductRoot)
            {
                query = query.Include(p => p.ProductRoot)
                    .ThenInclude(pr => pr!.TaxGroup);
            }

            if (parameters.IncludeProductWarehouses)
            {
                query = query.Include(p => p.ProductWarehouses);
            }

            if (parameters.IncludeShippingRestrictions)
            {
                query = query
                    .Include(p => p.AllowedShippingOptions)
                    .Include(p => p.ExcludedShippingOptions);
            }

            // Note: Cannot use NoTracking with circular references (ProductRoot->Products creates a cycle)
            // Only apply NoTracking if we're not including variants
            if (parameters.NoTracking && !parameters.IncludeVariants)
            {
                query = query.AsNoTracking();
            }

            return await query.FirstOrDefaultAsync(p => p.Id == parameters.ProductId, cancellationToken);
        });
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Query products with filtering, pagination and sorting
    /// </summary>
    /// <param name="parameters"></param>
    /// <param name="cancellationToken"></param>
    /// <returns></returns>
    public async Task<PaginatedList<Product>> QueryProducts(ProductQueryParameters parameters, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            // Build a base query without Includes; apply Includes only when materializing items.
            IQueryable<Product> baseQuery = db.Products;

            if (parameters.ProductTypeKey != null)
            {
                baseQuery = baseQuery.Where(x => x.ProductRoot.ProductType.Id == parameters.ProductTypeKey.Value);
            }

            if (parameters.CategoryIds?.Any() == true)
            {
                baseQuery = baseQuery.Where(x => x.ProductRoot.Categories.Any(pc => parameters.CategoryIds.Contains(pc.Id)));
            }

            if (parameters.FilterKeys?.Any() == true)
            {
                baseQuery = baseQuery.Where(x => x.Filters.Any(pc => parameters.FilterKeys.Contains(pc.Id)));
            }

            // Search filter - applied at DB level for performance
            if (!string.IsNullOrWhiteSpace(parameters.Search))
            {
                var searchLower = parameters.Search.ToLower();
                baseQuery = baseQuery.Where(x =>
                    (x.ProductRoot.RootName != null && x.ProductRoot.RootName.ToLower().Contains(searchLower)) ||
                    (x.Sku != null && x.Sku.ToLower().Contains(searchLower)));
            }

            // Availability filter - applied at DB level
            if (parameters.AvailabilityFilter == ProductAvailabilityFilter.Available)
            {
                baseQuery = baseQuery.Where(x => x.AvailableForPurchase && x.CanPurchase);
            }
            else if (parameters.AvailabilityFilter == ProductAvailabilityFilter.Unavailable)
            {
                baseQuery = baseQuery.Where(x => !x.AvailableForPurchase || !x.CanPurchase);
            }

            // Stock status filter - applied at DB level using ProductWarehouses
            if (parameters.StockStatusFilter != ProductStockStatusFilter.All)
            {
                var threshold = parameters.LowStockThreshold;
                baseQuery = parameters.StockStatusFilter switch
                {
                    ProductStockStatusFilter.InStock => baseQuery.Where(x =>
                        x.ProductWarehouses.Sum(pw => pw.Stock) > threshold),
                    ProductStockStatusFilter.LowStock => baseQuery.Where(x =>
                        x.ProductWarehouses.Sum(pw => pw.Stock) > 0 &&
                        x.ProductWarehouses.Sum(pw => pw.Stock) <= threshold),
                    ProductStockStatusFilter.OutOfStock => baseQuery.Where(x =>
                        x.ProductWarehouses.Sum(pw => pw.Stock) <= 0),
                    _ => baseQuery
                };
            }

            // Build the result query (collapsed to one variant per root when filters are applied)
            IQueryable<Product> resultQuery;

            if (parameters.FilterKeys?.Any() == true)
            {
                // Collapse to one matching variant per root using a correlated subquery
                var rootIdsQuery = baseQuery.Select(p => p.ProductRootId).Distinct();

                resultQuery = rootIdsQuery
                    .Select(rootId => baseQuery
                        .Where(p => p.ProductRootId == rootId)
                        .OrderByDescending(p => p.Default)
                        .ThenBy(p => p.Id)
                        .FirstOrDefault()!)!; // one product per root
            }
            else
            {
                // If no filters are applied, return only default variant unless explicitly asking for all variants
                resultQuery = parameters.AllVariants ? baseQuery : baseQuery.Where(x => x.Default);
            }

            // Paging
            var pageIndex = parameters.CurrentPage - 1;
            var pageSize = parameters.AmountPerPage;

            // Count before paging
            var totalCount = await resultQuery.Select(x => x.Id).CountAsync(cancellationToken: cancellationToken);

            // Order for consistent paging window
            var orderedQuery = ApplyOrdering(resultQuery, parameters.OrderBy);
            var orderedIds = await orderedQuery
                .Skip(pageIndex * pageSize)
                .Take(pageSize)
                .Select(x => x.Id)
                .ToListAsync(cancellationToken: cancellationToken);

            // Materialize items with requested Includes
            IQueryable<Product> itemsQuery = db.Products
                .Where(p => orderedIds.Contains(p.Id));
            itemsQuery = itemsQuery
                .Include(x => x.ProductRoot)
                .ThenInclude(x => x.Categories);

            if (parameters.FilterKeys?.Any() == true)
            {
                itemsQuery = itemsQuery.Include(x => x.Filters);
            }

            if (parameters.IncludeProductWarehouses)
            {
                itemsQuery = itemsQuery.Include(x => x.ProductWarehouses);
            }

            if (parameters.IncludeSiblingVariants)
            {
                itemsQuery = itemsQuery.Include(x => x.ProductRoot)
                    .ThenInclude(x => x.Products);
            }

            if (parameters.IncludeProductRootWarehouses)
            {
                itemsQuery = itemsQuery.Include(x => x.ProductRoot)
                    .ThenInclude(x => x.ProductRootWarehouses)
                    .ThenInclude(prw => prw.Warehouse)
                    .ThenInclude(w => w!.ShippingOptions);
            }

            // Note: Cannot use NoTracking with circular references (ProductRoot->Products creates a cycle)
            // Only apply NoTracking if we're not including sibling variants
            if (parameters.NoTracking && !parameters.IncludeSiblingVariants)
            {
                itemsQuery = itemsQuery.AsNoTracking();
            }

            // Ensure deterministic ordering of the final result set
            var items = await ApplyOrdering(itemsQuery, parameters.OrderBy)
                .ToListAsync(cancellationToken: cancellationToken);

            return new PaginatedList<Product>(items, totalCount, parameters.CurrentPage, parameters.AmountPerPage);
        });
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Query product roots with filtering and pagination
    /// </summary>
    /// <param name="parameters"></param>
    /// <param name="cancellationToken"></param>
    /// <returns></returns>
    public async Task<PaginatedList<ProductRoot>> QueryProductRoots(ProductRootQueryParameters parameters, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var query =
                db.RootProducts
                    .Include(x => x.Categories)
                    .Include(x => x.ProductType)
                    .AsQueryable();

            if (parameters.NoTracking)
            {
                query = query.AsNoTracking();
            }

            if (parameters.ProductTypeKey != null)
            {
                query = query.Where(x => x.ProductType.Id == parameters.ProductTypeKey);
            }

            if (parameters.CategoryIds?.Any() == true)
            {
                query = query.Where(x => x.Categories.Any(pc => parameters.CategoryIds.Contains(pc.Id)));
            }

            // Paging
            var pageIndex = parameters.CurrentPage - 1;
            var pageSize = parameters.AmountPerPage;

            var totalCount = await query.AsSplitQuery().Select(x => x.Id).CountAsync(cancellationToken: cancellationToken);

            var items = await query
                .AsSplitQuery()
                .Skip(pageIndex * pageSize)
                .Take(pageSize)
                .ToListAsync(cancellationToken: cancellationToken);

            return new PaginatedList<ProductRoot>(items, totalCount, parameters.CurrentPage, parameters.AmountPerPage);
        });
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Gets a product root with all details including variants, options, and warehouse stock
    /// </summary>
    public async Task<ProductRootDetailDto?> GetProductRootWithDetails(Guid productRootId, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var productRoot = await db.RootProducts
                .AsNoTracking()
                .Include(pr => pr.TaxGroup)
                .Include(pr => pr.ProductType)
                .Include(pr => pr.Categories)
                .Include(pr => pr.ProductRootWarehouses)
                    .ThenInclude(prw => prw.Warehouse)
                .Include(pr => pr.Products)
                    .ThenInclude(p => p.ProductWarehouses)
                        .ThenInclude(pw => pw.Warehouse)
                .AsSplitQuery()
                .FirstOrDefaultAsync(pr => pr.Id == productRootId, cancellationToken);

            if (productRoot == null)
            {
                return null;
            }

            return MapToProductRootDetailDto(productRoot);
        });
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Creates a new product root with a default variant
    /// </summary>
    public async Task<CrudResult<ProductRoot>> CreateProductRoot(CreateProductRootDto request, CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<ProductRoot>();
        ProductRoot? productRoot = null;
        using var scope = efCoreScopeProvider.CreateScope();

        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var taxGroup = await db.TaxGroups.FindAsync([request.TaxGroupId], cancellationToken);
            if (taxGroup == null)
            {
                result.AddErrorMessage("Tax group not found");
                return;
            }

            var productType = await db.ProductTypes.FindAsync([request.ProductTypeId], cancellationToken);
            if (productType == null)
            {
                result.AddErrorMessage("Product type not found");
                return;
            }

            var categories = request.CategoryIds?.Any() == true
                ? await db.ProductCategories.Where(c => request.CategoryIds.Contains(c.Id)).ToListAsync(cancellationToken)
                : [];

            // Validate SKU uniqueness if one was provided
            if (!string.IsNullOrEmpty(request.DefaultVariant.Sku))
            {
                var skuExists = await db.Products.AnyAsync(p => p.Sku == request.DefaultVariant.Sku, cancellationToken);
                if (skuExists)
                {
                    result.AddErrorMessage($"SKU '{request.DefaultVariant.Sku}' already exists");
                    return;
                }
            }

            productRoot = new ProductRoot
            {
                Id = Guid.NewGuid(),
                RootName = request.RootName,
                RootUrl = slugHelper.GenerateSlug(request.RootName),
                TaxGroup = taxGroup,
                TaxGroupId = request.TaxGroupId,
                ProductType = productType,
                ProductTypeId = request.ProductTypeId,
                IsDigitalProduct = request.IsDigitalProduct,
                Categories = categories,
                RootImages = request.RootImages?.Select(g => g.ToString()).ToList() ?? []
            };

            db.RootProducts.Add(productRoot);

            // Create default variant
            var defaultVariant = productFactory.Create(
                productRoot,
                request.DefaultVariant.Name ?? request.RootName,
                request.DefaultVariant.Price,
                request.DefaultVariant.CostOfGoods,
                request.DefaultVariant.Gtin ?? "",
                request.DefaultVariant.Sku ?? "",
                true,
                null);

            defaultVariant.AvailableForPurchase = request.DefaultVariant.AvailableForPurchase;
            defaultVariant.CanPurchase = request.DefaultVariant.CanPurchase;

            db.Products.Add(defaultVariant);

            // Handle warehouse assignments (only for non-digital products)
            if (!request.IsDigitalProduct && request.WarehouseIds?.Any() == true)
            {
                var warehouses = await db.Warehouses
                    .Where(w => request.WarehouseIds.Contains(w.Id))
                    .ToListAsync(cancellationToken);

                foreach (var warehouse in warehouses)
                {
                    var prw = new ProductRootWarehouse
                    {
                        ProductRootId = productRoot.Id,
                        WarehouseId = warehouse.Id
                    };
                    db.ProductRootWarehouses.Add(prw);
                }
            }

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
        });

        scope.Complete();
        result.ResultObject = productRoot;
        return result;
    }

    /// <summary>
    /// Updates an existing product root
    /// </summary>
    public async Task<CrudResult<ProductRoot>> UpdateProductRoot(Guid productRootId, UpdateProductRootDto request, CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<ProductRoot>();
        ProductRoot? productRoot = null;
        using var scope = efCoreScopeProvider.CreateScope();

        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            productRoot = await db.RootProducts
                .Include(pr => pr.Categories)
                .Include(pr => pr.ProductRootWarehouses)
                .Include(pr => pr.Products)
                .FirstOrDefaultAsync(pr => pr.Id == productRootId, cancellationToken);

            if (productRoot == null)
            {
                result.AddErrorMessage("Product root not found");
                return;
            }

            // Update simple properties
            if (request.RootName != null)
            {
                productRoot.RootName = request.RootName;

                // For single-variant products, sync variant name with root name
                if (productRoot.Products.Count == 1)
                {
                    var singleVariant = productRoot.Products.First();
                    singleVariant.Name = request.RootName;
                }
            }
            if (request.RootUrl != null) productRoot.RootUrl = request.RootUrl;
            if (request.SellingPoints != null) productRoot.SellingPoints = request.SellingPoints;
            if (request.Videos != null) productRoot.Videos = request.Videos;
            if (request.GoogleShoppingFeedCategory != null) productRoot.GoogleShoppingFeedCategory = request.GoogleShoppingFeedCategory;
            if (request.DefaultPackageConfigurations != null)
            {
                productRoot.DefaultPackageConfigurations = request.DefaultPackageConfigurations
                    .Select(p => new ProductPackage
                    {
                        Weight = p.Weight,
                        LengthCm = p.LengthCm,
                        WidthCm = p.WidthCm,
                        HeightCm = p.HeightCm
                    }).ToList();
            }
            if (request.IsDigitalProduct.HasValue) productRoot.IsDigitalProduct = request.IsDigitalProduct.Value;
            if (request.RootImages != null) productRoot.RootImages = request.RootImages.Select(g => g.ToString()).ToList();
            if (request.Description != null) productRoot.Description = request.Description;
            if (request.MetaDescription != null) productRoot.MetaDescription = request.MetaDescription;
            if (request.PageTitle != null) productRoot.PageTitle = request.PageTitle;
            if (request.NoIndex.HasValue) productRoot.NoIndex = request.NoIndex.Value;
            if (request.OpenGraphImage != null) productRoot.OpenGraphImage = request.OpenGraphImage;
            if (request.CanonicalUrl != null) productRoot.CanonicalUrl = request.CanonicalUrl;
            if (request.ElementProperties != null) productRoot.ElementPropertyData = SerializeElementProperties(request.ElementProperties);
            if (request.ViewAlias != null) productRoot.ViewAlias = request.ViewAlias;

            // Update tax group
            if (request.TaxGroupId.HasValue && request.TaxGroupId.Value != productRoot.TaxGroupId)
            {
                var newTaxGroup = await db.TaxGroups.FindAsync([request.TaxGroupId.Value], cancellationToken);
                if (newTaxGroup == null)
                {
                    result.AddErrorMessage("Tax group not found");
                    return;
                }
                productRoot.TaxGroup = newTaxGroup;
                productRoot.TaxGroupId = request.TaxGroupId.Value;
            }

            // Update product type
            if (request.ProductTypeId.HasValue && request.ProductTypeId.Value != productRoot.ProductTypeId)
            {
                var newProductType = await db.ProductTypes.FindAsync([request.ProductTypeId.Value], cancellationToken);
                if (newProductType == null)
                {
                    result.AddErrorMessage("Product type not found");
                    return;
                }
                productRoot.ProductType = newProductType;
                productRoot.ProductTypeId = request.ProductTypeId.Value;
            }

            // Update categories
            if (request.CategoryIds != null)
            {
                productRoot.Categories.Clear();
                if (request.CategoryIds.Any())
                {
                    var categories = await db.ProductCategories
                        .Where(c => request.CategoryIds.Contains(c.Id))
                        .ToListAsync(cancellationToken);
                    foreach (var category in categories)
                    {
                        productRoot.Categories.Add(category);
                    }
                }
            }

            // Update warehouses
            if (request.WarehouseIds != null)
            {
                // Remove existing warehouse assignments
                var existingWarehouses = productRoot.ProductRootWarehouses.ToList();
                foreach (var prw in existingWarehouses)
                {
                    db.ProductRootWarehouses.Remove(prw);
                }

                // Add new warehouse assignments
                if (request.WarehouseIds.Any())
                {
                    foreach (var warehouseId in request.WarehouseIds)
                    {
                        var prw = new ProductRootWarehouse
                        {
                            ProductRootId = productRoot.Id,
                            WarehouseId = warehouseId
                        };
                        db.ProductRootWarehouses.Add(prw);
                    }
                }
            }

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
        });

        scope.Complete();
        result.ResultObject = productRoot;
        return result;
    }

    /// <summary>
    /// Deletes a product root and all its variants
    /// </summary>
    public async Task<CrudResult<bool>> DeleteProductRoot(Guid productRootId, CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();
        using var scope = efCoreScopeProvider.CreateScope();

        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var productRoot = await db.RootProducts
                .Include(pr => pr.Products)
                .FirstOrDefaultAsync(pr => pr.Id == productRootId, cancellationToken);

            if (productRoot == null)
            {
                result.AddErrorMessage("Product root not found");
                return;
            }

            // Remove all products (variants)
            foreach (var product in productRoot.Products.ToList())
            {
                db.Products.Remove(product);
            }

            db.RootProducts.Remove(productRoot);
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
            result.ResultObject = true;
        });

        scope.Complete();
        return result;
    }

    /// <summary>
    /// Gets a specific variant by product root ID and variant ID
    /// </summary>
    public async Task<Product?> GetVariant(Guid productRootId, Guid variantId, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            return await db.Products
                .AsNoTracking()
                .Include(p => p.ProductWarehouses)
                    .ThenInclude(pw => pw.Warehouse)
                .FirstOrDefaultAsync(p => p.ProductRootId == productRootId && p.Id == variantId, cancellationToken);
        });
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Updates a specific variant
    /// </summary>
    public async Task<CrudResult<Product>> UpdateVariant(Guid productRootId, Guid variantId, UpdateVariantDto request, CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Product>();
        Product? variant = null;
        using var scope = efCoreScopeProvider.CreateScope();

        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            variant = await db.Products
                .FirstOrDefaultAsync(p => p.ProductRootId == productRootId && p.Id == variantId, cancellationToken);

            if (variant == null)
            {
                result.AddErrorMessage("Variant not found");
                return;
            }

            // Validate SKU uniqueness if being updated
            if (request.Sku != null && request.Sku != variant.Sku)
            {
                var skuExists = await db.Products.AnyAsync(p => p.Sku == request.Sku && p.Id != variantId, cancellationToken);
                if (skuExists)
                {
                    result.AddErrorMessage($"SKU '{request.Sku}' already exists");
                    return;
                }
            }

            // Update properties if provided
            if (request.Name != null) variant.Name = request.Name;
            if (request.Sku != null) variant.Sku = request.Sku;
            if (request.Gtin != null) variant.Gtin = request.Gtin;
            if (request.SupplierSku != null) variant.SupplierSku = request.SupplierSku;
            if (request.Price.HasValue) variant.Price = request.Price.Value;
            if (request.CostOfGoods.HasValue) variant.CostOfGoods = request.CostOfGoods.Value;
            if (request.OnSale.HasValue) variant.OnSale = request.OnSale.Value;
            if (request.PreviousPrice.HasValue) variant.PreviousPrice = request.PreviousPrice.Value;
            if (request.AvailableForPurchase.HasValue) variant.AvailableForPurchase = request.AvailableForPurchase.Value;
            if (request.CanPurchase.HasValue) variant.CanPurchase = request.CanPurchase.Value;
            if (request.ExcludeRootProductImages.HasValue) variant.ExcludeRootProductImages = request.ExcludeRootProductImages.Value;
            if (request.Url != null) variant.Url = request.Url;
            if (request.Images != null) variant.Images = request.Images.Select(g => g.ToString()).ToList();

            // HS Code
            if (request.HsCode != null) variant.HsCode = request.HsCode;

            // Package configurations (overrides root if provided)
            if (request.PackageConfigurations != null)
            {
                variant.PackageConfigurations = request.PackageConfigurations
                    .Select(p => new ProductPackage
                    {
                        Weight = p.Weight,
                        LengthCm = p.LengthCm,
                        WidthCm = p.WidthCm,
                        HeightCm = p.HeightCm
                    }).ToList();
            }

            // Shopping Feed
            if (request.ShoppingFeedTitle != null) variant.ShoppingFeedTitle = request.ShoppingFeedTitle;
            if (request.ShoppingFeedDescription != null) variant.ShoppingFeedDescription = request.ShoppingFeedDescription;
            if (request.ShoppingFeedColour != null) variant.ShoppingFeedColour = request.ShoppingFeedColour;
            if (request.ShoppingFeedMaterial != null) variant.ShoppingFeedMaterial = request.ShoppingFeedMaterial;
            if (request.ShoppingFeedSize != null) variant.ShoppingFeedSize = request.ShoppingFeedSize;
            if (request.RemoveFromFeed.HasValue) variant.RemoveFromFeed = request.RemoveFromFeed.Value;

            // Warehouse stock settings
            if (request.WarehouseStock != null)
            {
                foreach (var stockRequest in request.WarehouseStock)
                {
                    var existingStock = await db.ProductWarehouses
                        .FirstOrDefaultAsync(pw => pw.ProductId == variantId && pw.WarehouseId == stockRequest.WarehouseId, cancellationToken);

                    if (existingStock != null)
                    {
                        // Update existing record
                        existingStock.Stock = stockRequest.Stock;
                        existingStock.ReorderPoint = stockRequest.ReorderPoint;
                        existingStock.ReorderQuantity = stockRequest.ReorderQuantity;
                        existingStock.TrackStock = stockRequest.TrackStock;
                    }
                    else
                    {
                        // Create new record with default stock of 0
                        db.ProductWarehouses.Add(new ProductWarehouse
                        {
                            ProductId = variantId,
                            WarehouseId = stockRequest.WarehouseId,
                            Stock = stockRequest.Stock,
                            ReorderPoint = stockRequest.ReorderPoint,
                            ReorderQuantity = stockRequest.ReorderQuantity,
                            TrackStock = stockRequest.TrackStock
                        });
                    }
                }
            }

            variant.DateUpdated = DateTime.Now;

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
        });

        scope.Complete();
        result.ResultObject = variant;
        return result;
    }

    /// <summary>
    /// Saves product options (creates new, updates existing, deletes removed)
    /// </summary>
    public async Task<CrudResult<List<ProductOption>>> SaveProductOptions(Guid productRootId, List<SaveProductOptionDto> options, CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<List<ProductOption>>();
        List<ProductOption> savedOptions = [];
        using var scope = efCoreScopeProvider.CreateScope();

        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var productRoot = await db.RootProducts
                .FirstOrDefaultAsync(pr => pr.Id == productRootId, cancellationToken);

            if (productRoot == null)
            {
                result.AddErrorMessage("Product root not found");
                return;
            }

            // Get existing option IDs from request
            var requestOptionIds = options.Where(o => o.Id.HasValue).Select(o => o.Id!.Value).ToHashSet();

            // Delete options that are no longer in the request
            var optionsToRemove = productRoot.ProductOptions.Where(o => !requestOptionIds.Contains(o.Id)).ToList();
            foreach (var option in optionsToRemove)
            {
                productRoot.ProductOptions.Remove(option);
            }

            // Update or create options
            foreach (var optionRequest in options)
            {
                ProductOption option;

                if (optionRequest.Id.HasValue)
                {
                    // Update existing option
                    option = productRoot.ProductOptions.FirstOrDefault(o => o.Id == optionRequest.Id.Value)!;
                    if (option == null)
                    {
                        result.AddWarningMessage($"Option with ID {optionRequest.Id} not found, creating new");
                        option = productOptionFactory.CreateEmpty();
                        productRoot.ProductOptions.Add(option);
                    }
                }
                else
                {
                    // Create new option
                    option = productOptionFactory.CreateEmpty();
                    productRoot.ProductOptions.Add(option);
                }

                option.Name = optionRequest.Name;
                option.Alias = optionRequest.Alias;
                option.SortOrder = optionRequest.SortOrder;
                option.OptionTypeAlias = optionRequest.OptionTypeAlias;
                option.OptionUiAlias = optionRequest.OptionUiAlias;
                option.IsVariant = optionRequest.IsVariant;

                // Handle values
                var requestValueIds = optionRequest.Values.Where(v => v.Id.HasValue).Select(v => v.Id!.Value).ToHashSet();
                var valuesToRemove = option.ProductOptionValues.Where(v => !requestValueIds.Contains(v.Id)).ToList();
                foreach (var value in valuesToRemove)
                {
                    option.ProductOptionValues.Remove(value);
                }

                foreach (var valueRequest in optionRequest.Values)
                {
                    ProductOptionValue value;

                    if (valueRequest.Id.HasValue)
                    {
                        value = option.ProductOptionValues.FirstOrDefault(v => v.Id == valueRequest.Id.Value)!;
                        if (value == null)
                        {
                            value = productOptionFactory.CreateEmptyValue();
                            option.ProductOptionValues.Add(value);
                        }
                    }
                    else
                    {
                        value = productOptionFactory.CreateEmptyValue();
                        option.ProductOptionValues.Add(value);
                    }

                    value.Name = valueRequest.Name;
                    value.FullName = valueRequest.FullName ?? $"{option.Name}: {valueRequest.Name}";
                    value.SortOrder = valueRequest.SortOrder;
                    value.HexValue = valueRequest.HexValue;
                    value.MediaKey = valueRequest.MediaKey;
                    value.PriceAdjustment = valueRequest.PriceAdjustment;
                    value.CostAdjustment = valueRequest.CostAdjustment;
                    value.SkuSuffix = valueRequest.SkuSuffix;
                }

                savedOptions.Add(option);
            }

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
        });

        scope.Complete();
        result.ResultObject = savedOptions;

        // Auto-regenerate variants if the options save was successful
        if (result.Successful)
        {
            // Check if there are any variant options (that generate variants)
            var hasVariantOptions = options.Any(o => o.IsVariant);

            logger.LogDebug("SaveProductOptions: Saved {OptionCount} options for product {ProductRootId}. HasVariantOptions: {HasVariantOptions}",
                options.Count, productRootId, hasVariantOptions);

            // Always regenerate to ensure variants match current options
            // This handles: adding variant options, removing variant options, changing option values
            var regenerateResult = await RegenerateVariants(productRootId, cancellationToken: cancellationToken);
            if (!regenerateResult.Successful)
            {
                result.AddWarningMessage("Options saved but variant regeneration had issues: " +
                    string.Join(", ", regenerateResult.Messages.Select(m => m.Message)));
            }
        }

        return result;
    }

    /// <summary>
    /// Regenerates variants based on current options. Called internally when options are saved.
    /// </summary>
    /// <param name="productRootId">The product root ID</param>
    /// <param name="priceOverride">Optional price override. If null, uses existing default product price.</param>
    /// <param name="costOverride">Optional cost override. If null, uses existing default product cost.</param>
    /// <param name="cancellationToken">Cancellation token</param>
    private async Task<CrudResult<List<Product>>> RegenerateVariants(
        Guid productRootId,
        decimal? priceOverride = null,
        decimal? costOverride = null,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<List<Product>>();
        List<Product>? generatedVariants = null;
        using var scope = efCoreScopeProvider.CreateScope();

        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var productRoot = await db.RootProducts
                .Include(pr => pr.Products)
                .FirstOrDefaultAsync(pr => pr.Id == productRootId, cancellationToken);

            if (productRoot == null)
            {
                result.AddErrorMessage("Product root not found");
                return;
            }

            var variantOptions = productRoot.ProductOptions.Where(o => o.IsVariant).ToList();

            if (!variantOptions.Any())
            {
                // No variant options, ensure there's a single default product
                if (productRoot.Products.Count > 1)
                {
                    var defaultProduct = productRoot.Products.FirstOrDefault(p => p.Default) ?? productRoot.Products.First();
                    var toRemove = productRoot.Products.Where(p => p.Id != defaultProduct.Id).ToList();
                    foreach (var p in toRemove)
                    {
                        db.Products.Remove(p);
                    }
                    defaultProduct.Default = true;
                    defaultProduct.VariantOptionsKey = null;
                    generatedVariants = [defaultProduct];
                }
                else if (productRoot.Products.Count == 1)
                {
                    var product = productRoot.Products.First();
                    product.Default = true;
                    product.VariantOptionsKey = null;
                    generatedVariants = [product];
                }
                else
                {
                    // Create a default product
                    var defaultPrice = priceOverride ?? 0;
                    var defaultCost = costOverride ?? 0;
                    var product = productFactory.Create(productRoot, productRoot.RootName ?? "Default", defaultPrice, defaultCost, "", "", true, null);
                    db.Products.Add(product);
                    generatedVariants = [product];
                }
            }
            else
            {
                // Get template values from existing products (use overrides if provided)
                var template = productRoot.Products.FirstOrDefault(p => p.Default) ?? productRoot.Products.FirstOrDefault();
                var defaultPrice = priceOverride ?? template?.Price ?? 0;
                var defaultCostOfGoods = costOverride ?? template?.CostOfGoods ?? 0;

                // Remove all existing products
                foreach (var product in productRoot.Products.ToList())
                {
                    db.Products.Remove(product);
                }

                // Generate new variants
                var duplicateSkus = await CreateVariantsNewAsync(db, productRoot, defaultPrice, defaultCostOfGoods, "", "", cancellationToken);
                if (duplicateSkus.Count != 0)
                {
                    result.AddErrorMessage($"Duplicate SKUs found: {string.Join(", ", duplicateSkus)}");
                    return;
                }

                await db.SaveChangesAsync(cancellationToken);

                generatedVariants = await db.Products
                    .Where(p => p.ProductRootId == productRootId)
                    .ToListAsync(cancellationToken);
            }

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
        });

        scope.Complete();
        result.ResultObject = generatedVariants;

        logger.LogDebug("RegenerateVariants: Generated {VariantCount} variants for product {ProductRootId}",
            generatedVariants?.Count ?? 0, productRootId);

        return result;
    }

    /// <summary>
    /// Maps a ProductRoot entity to a ProductRootDetailDto
    /// </summary>
    private ProductRootDetailDto MapToProductRootDetailDto(ProductRoot productRoot)
    {
        return new ProductRootDetailDto
        {
            Id = productRoot.Id,
            RootName = productRoot.RootName ?? string.Empty,
            RootImages = productRoot.RootImages.Select(s => Guid.TryParse(s, out var g) ? g : Guid.Empty).Where(g => g != Guid.Empty).ToList(),
            RootUrl = productRoot.RootUrl,
            SellingPoints = productRoot.SellingPoints,
            Videos = productRoot.Videos,
            GoogleShoppingFeedCategory = productRoot.GoogleShoppingFeedCategory,
            IsDigitalProduct = productRoot.IsDigitalProduct,
            DefaultPackageConfigurations = productRoot.DefaultPackageConfigurations.Select(p => new ProductPackageDto
            {
                Weight = p.Weight,
                LengthCm = p.LengthCm,
                WidthCm = p.WidthCm,
                HeightCm = p.HeightCm
            }).ToList(),
            Description = productRoot.Description,
            MetaDescription = productRoot.MetaDescription,
            PageTitle = productRoot.PageTitle,
            NoIndex = productRoot.NoIndex,
            OpenGraphImage = productRoot.OpenGraphImage,
            CanonicalUrl = productRoot.CanonicalUrl,
            TaxGroupId = productRoot.TaxGroupId,
            TaxGroupName = productRoot.TaxGroup?.Name,
            ProductTypeId = productRoot.ProductTypeId,
            ProductTypeName = productRoot.ProductType?.Name,
            CategoryIds = productRoot.Categories.Select(c => c.Id).ToList(),
            WarehouseIds = productRoot.ProductRootWarehouses.Select(prw => prw.WarehouseId).ToList(),
            ProductOptions = productRoot.ProductOptions.OrderBy(o => o.SortOrder).Select(MapToProductOptionDto).ToList(),
            Variants = productRoot.Products.OrderByDescending(p => p.Default).ThenBy(p => p.Name)
                .Select(p => MapToProductVariantDto(p, productRoot.ProductRootWarehouses)).ToList(),
            ElementProperties = DeserializeElementProperties(productRoot.ElementPropertyData),
            ViewAlias = productRoot.ViewAlias
        };
    }

    /// <summary>
    /// Maps a ProductOption entity to a ProductOptionDto
    /// </summary>
    private static ProductOptionDto MapToProductOptionDto(ProductOption option)
    {
        return new ProductOptionDto
        {
            Id = option.Id,
            Name = option.Name ?? string.Empty,
            Alias = option.Alias,
            SortOrder = option.SortOrder,
            OptionTypeAlias = option.OptionTypeAlias,
            OptionUiAlias = option.OptionUiAlias,
            IsVariant = option.IsVariant,
            Values = option.ProductOptionValues.OrderBy(v => v.SortOrder).Select(MapToProductOptionValueDto).ToList()
        };
    }

    /// <summary>
    /// Maps a ProductOptionValue entity to a ProductOptionValueDto
    /// </summary>
    private static ProductOptionValueDto MapToProductOptionValueDto(ProductOptionValue value)
    {
        return new ProductOptionValueDto
        {
            Id = value.Id,
            Name = value.Name ?? string.Empty,
            FullName = value.FullName,
            SortOrder = value.SortOrder,
            HexValue = value.HexValue,
            MediaKey = value.MediaKey,
            PriceAdjustment = value.PriceAdjustment,
            CostAdjustment = value.CostAdjustment,
            SkuSuffix = value.SkuSuffix
        };
    }

    /// <summary>
    /// Maps a Product entity to a ProductVariantDto
    /// </summary>
    private static ProductVariantDto MapToProductVariantDto(Product product, ICollection<ProductRootWarehouse> rootWarehouses)
    {
        // Build warehouse stock from root warehouses, using actual stock if it exists
        var warehouseStock = rootWarehouses.Select(rw =>
        {
            var existingStock = product.ProductWarehouses?.FirstOrDefault(pw => pw.WarehouseId == rw.WarehouseId);
            return new VariantWarehouseStockDto
            {
                WarehouseId = rw.WarehouseId,
                WarehouseName = rw.Warehouse?.Name,
                Stock = existingStock?.Stock ?? 0,
                ReorderPoint = existingStock?.ReorderPoint,
                ReorderQuantity = existingStock?.ReorderQuantity,
                TrackStock = existingStock?.TrackStock ?? true
            };
        }).ToList();

        return new ProductVariantDto
        {
            Id = product.Id,
            ProductRootId = product.ProductRootId,
            Default = product.Default,
            Name = product.Name,
            Sku = product.Sku,
            Gtin = product.Gtin,
            SupplierSku = product.SupplierSku,
            Price = product.Price,
            CostOfGoods = product.CostOfGoods,
            OnSale = product.OnSale,
            PreviousPrice = product.PreviousPrice,
            AvailableForPurchase = product.AvailableForPurchase,
            CanPurchase = product.CanPurchase,
            Images = product.Images.Select(s => Guid.TryParse(s, out var g) ? g : Guid.Empty).Where(g => g != Guid.Empty).ToList(),
            ExcludeRootProductImages = product.ExcludeRootProductImages,
            Url = product.Url,
            VariantOptionsKey = product.VariantOptionsKey,
            HsCode = product.HsCode,
            PackageConfigurations = product.PackageConfigurations.Select(p => new ProductPackageDto
            {
                Weight = p.Weight,
                LengthCm = p.LengthCm,
                WidthCm = p.WidthCm,
                HeightCm = p.HeightCm
            }).ToList(),
            ShoppingFeedTitle = product.ShoppingFeedTitle,
            ShoppingFeedDescription = product.ShoppingFeedDescription,
            ShoppingFeedColour = product.ShoppingFeedColour,
            ShoppingFeedMaterial = product.ShoppingFeedMaterial,
            ShoppingFeedSize = product.ShoppingFeedSize,
            RemoveFromFeed = product.RemoveFromFeed,
            TotalStock = warehouseStock.Sum(ws => ws.Stock),
            WarehouseStock = warehouseStock
        };
    }

    #region Filter Operations

    /// <summary>
    /// Creates a new product filter group
    /// </summary>
    public async Task<CrudResult<ProductFilterGroup>> CreateFilterGroup(
        string name,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<ProductFilterGroup>();

        var filterGroup = new ProductFilterGroup
        {
            Id = GuidExtensions.NewSequentialGuid,
            Name = name
        };

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            db.ProductFilterGroups.Add(filterGroup);
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
        });
        scope.Complete();

        result.ResultObject = filterGroup;
        return result;
    }

    /// <summary>
    /// Creates a new product filter within a filter group
    /// </summary>
    public async Task<CrudResult<ProductFilter>> CreateFilter(
        Guid filterGroupId,
        string name,
        string? hexColour = null,
        Guid? image = null,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<ProductFilter>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            // Get the current filter count for sort order
            var filterCount = await db.ProductFilters
                .CountAsync(f => f.ProductFilterGroupId == filterGroupId, cancellationToken);

            // Verify filter group exists
            var filterGroupExists = await db.ProductFilterGroups
                .AnyAsync(fg => fg.Id == filterGroupId, cancellationToken);

            if (!filterGroupExists)
            {
                result.AddErrorMessage($"Filter group with ID {filterGroupId} not found");
                return;
            }

            var filter = new ProductFilter
            {
                Id = GuidExtensions.NewSequentialGuid,
                Name = name,
                HexColour = hexColour,
                Image = image,
                SortOrder = filterCount,
                ProductFilterGroupId = filterGroupId
            };

            db.ProductFilters.Add(filter);
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            result.ResultObject = filter;
        });
        scope.Complete();

        return result;
    }

    /// <summary>
    /// Gets a single filter group by ID
    /// </summary>
    public async Task<ProductFilterGroup?> GetFilterGroup(Guid filterGroupId, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.ProductFilterGroups
                .Include(fg => fg.Filters)
                .FirstOrDefaultAsync(fg => fg.Id == filterGroupId, cancellationToken));
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Updates a filter group
    /// </summary>
    public async Task<CrudResult<ProductFilterGroup>> UpdateFilterGroup(
        Guid filterGroupId,
        string? name,
        int? sortOrder,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<ProductFilterGroup>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var filterGroup = await db.ProductFilterGroups
                .Include(fg => fg.Filters)
                .FirstOrDefaultAsync(fg => fg.Id == filterGroupId, cancellationToken);

            if (filterGroup == null)
            {
                result.AddErrorMessage($"Filter group with ID {filterGroupId} not found");
                return;
            }

            if (name != null) filterGroup.Name = name;
            if (sortOrder.HasValue) filterGroup.SortOrder = sortOrder.Value;

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
            result.ResultObject = filterGroup;
        });
        scope.Complete();

        return result;
    }

    /// <summary>
    /// Deletes a filter group and all its filters
    /// </summary>
    public async Task<CrudResult<bool>> DeleteFilterGroup(Guid filterGroupId, CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var filterGroup = await db.ProductFilterGroups
                .Include(fg => fg.Filters)
                .FirstOrDefaultAsync(fg => fg.Id == filterGroupId, cancellationToken);

            if (filterGroup == null)
            {
                result.AddErrorMessage($"Filter group with ID {filterGroupId} not found");
                return;
            }

            // Remove all filters in the group first
            db.ProductFilters.RemoveRange(filterGroup.Filters);
            db.ProductFilterGroups.Remove(filterGroup);

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
            result.ResultObject = true;
        });
        scope.Complete();

        return result;
    }

    /// <summary>
    /// Reorders filter groups by setting their sort order based on the provided ordered list of IDs
    /// </summary>
    public async Task<CrudResult<bool>> ReorderFilterGroups(List<Guid> orderedIds, CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var filterGroups = await db.ProductFilterGroups
                .Where(fg => orderedIds.Contains(fg.Id))
                .ToListAsync(cancellationToken);

            for (var i = 0; i < orderedIds.Count; i++)
            {
                var filterGroup = filterGroups.FirstOrDefault(fg => fg.Id == orderedIds[i]);
                if (filterGroup != null)
                {
                    filterGroup.SortOrder = i;
                }
            }

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
            result.ResultObject = true;
        });
        scope.Complete();

        return result;
    }

    /// <summary>
    /// Gets a single filter by ID
    /// </summary>
    public async Task<ProductFilter?> GetFilter(Guid filterId, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.ProductFilters
                .FirstOrDefaultAsync(f => f.Id == filterId, cancellationToken));
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Updates a filter
    /// </summary>
    public async Task<CrudResult<ProductFilter>> UpdateFilter(
        Guid filterId,
        string? name,
        string? hexColour,
        Guid? image,
        int? sortOrder,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<ProductFilter>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var filter = await db.ProductFilters
                .FirstOrDefaultAsync(f => f.Id == filterId, cancellationToken);

            if (filter == null)
            {
                result.AddErrorMessage($"Filter with ID {filterId} not found");
                return;
            }

            if (name != null) filter.Name = name;
            if (hexColour != null) filter.HexColour = hexColour == "" ? null : hexColour;
            if (image.HasValue) filter.Image = image.Value == Guid.Empty ? null : image.Value;
            if (sortOrder.HasValue) filter.SortOrder = sortOrder.Value;

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
            result.ResultObject = filter;
        });
        scope.Complete();

        return result;
    }

    /// <summary>
    /// Deletes a filter
    /// </summary>
    public async Task<CrudResult<bool>> DeleteFilter(Guid filterId, CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var filter = await db.ProductFilters
                .FirstOrDefaultAsync(f => f.Id == filterId, cancellationToken);

            if (filter == null)
            {
                result.AddErrorMessage($"Filter with ID {filterId} not found");
                return;
            }

            db.ProductFilters.Remove(filter);
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
            result.ResultObject = true;
        });
        scope.Complete();

        return result;
    }

    /// <summary>
    /// Reorders filters within a group by setting their sort order based on the provided ordered list of IDs
    /// </summary>
    public async Task<CrudResult<bool>> ReorderFilters(Guid filterGroupId, List<Guid> orderedIds, CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var filters = await db.ProductFilters
                .Where(f => f.ProductFilterGroupId == filterGroupId && orderedIds.Contains(f.Id))
                .ToListAsync(cancellationToken);

            for (var i = 0; i < orderedIds.Count; i++)
            {
                var filter = filters.FirstOrDefault(f => f.Id == orderedIds[i]);
                if (filter != null)
                {
                    filter.SortOrder = i;
                }
            }

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
            result.ResultObject = true;
        });
        scope.Complete();

        return result;
    }

    /// <summary>
    /// Assigns filters to a product, replacing any existing filter assignments
    /// </summary>
    public async Task<CrudResult<bool>> AssignFiltersToProduct(Guid productId, List<Guid> filterIds, CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var product = await db.Products
                .Include(p => p.Filters)
                .FirstOrDefaultAsync(p => p.Id == productId, cancellationToken);

            if (product == null)
            {
                result.AddErrorMessage($"Product with ID {productId} not found");
                return;
            }

            // Get the filters to assign
            var filtersToAssign = await db.ProductFilters
                .Where(f => filterIds.Contains(f.Id))
                .ToListAsync(cancellationToken);

            // Clear existing and add new assignments
            product.Filters.Clear();
            foreach (var filter in filtersToAssign)
            {
                product.Filters.Add(filter);
            }

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
            result.ResultObject = true;
        });
        scope.Complete();

        return result;
    }

    /// <summary>
    /// Gets all filters assigned to a product
    /// </summary>
    public async Task<List<ProductFilter>> GetFiltersForProduct(Guid productId, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var product = await db.Products
                .Include(p => p.Filters)
                .FirstOrDefaultAsync(p => p.Id == productId, cancellationToken);

            return product?.Filters.ToList() ?? [];
        });
        scope.Complete();
        return result;
    }

    #endregion

    #region Query/Count Operations

    /// <summary>
    /// Checks if any products exist in the database
    /// </summary>
    public async Task<bool> AnyProductsExistAsync(CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.RootProducts.AnyAsync(cancellationToken));
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Gets the total count of products
    /// </summary>
    public async Task<int> GetProductCountAsync(CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.Products.CountAsync(cancellationToken));
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Gets all products with their TaxGroup loaded for invoice/basket creation
    /// </summary>
    public async Task<List<Product>> GetAllProductsWithTaxGroupAsync(CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.Products
                .Include(p => p.ProductRoot)
                    .ThenInclude(pr => pr!.TaxGroup)
                .ToListAsync(cancellationToken));
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Gets product IDs grouped by country availability (products that have stock in warehouses serving each country)
    /// </summary>
    public async Task<Dictionary<string, HashSet<Guid>>> GetProductIdsByCountryAvailabilityAsync(CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            // Load data first then process in-memory to avoid SQL APPLY (not supported by SQLite)
            var productWarehouseData = await db.ProductWarehouses
                .Where(pw => pw.Stock > 0 || !pw.TrackStock)
                .Include(pw => pw.Warehouse)
                    .ThenInclude(w => w.ServiceRegions)
                .Select(pw => new { pw.ProductId, pw.Warehouse.ServiceRegions })
                .ToListAsync(cancellationToken);

            return productWarehouseData
                .SelectMany(pw => pw.ServiceRegions.Select(sr => new { sr.CountryCode, pw.ProductId }))
                .GroupBy(x => x.CountryCode)
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(x => x.ProductId).Distinct().ToHashSet());
        });
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Gets the first image GUID for multiple products by their IDs.
    /// Falls back from variant images to root images.
    /// </summary>
    public async Task<Dictionary<Guid, string?>> GetProductImagesAsync(IEnumerable<Guid> productIds, CancellationToken cancellationToken = default)
    {
        var ids = productIds.ToList();
        if (ids.Count == 0)
            return new Dictionary<Guid, string?>();

        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var products = await db.Products
                .Include(p => p.ProductRoot)
                .Where(p => ids.Contains(p.Id))
                .Select(p => new { p.Id, p.Images, RootImages = p.ProductRoot!.RootImages })
                .ToListAsync(cancellationToken);

            return products.ToDictionary(
                p => p.Id,
                p => p.Images.FirstOrDefault() ?? p.RootImages.FirstOrDefault());
        });
        scope.Complete();
        return result;
    }

    #endregion

    #region Element Type Support

    /// <summary>
    /// Gets the configured Element Type for products, if any.
    /// </summary>
    public Task<IContentType?> GetProductElementTypeAsync(CancellationToken cancellationToken = default)
    {
        var alias = settings.Value.ProductElementTypeAlias;
        if (string.IsNullOrEmpty(alias)) return Task.FromResult<IContentType?>(null);

        var contentType = contentTypeService.Get(alias);

        // Must be an Element Type
        if (contentType is null || !contentType.IsElement)
        {
            logger.LogWarning(
                "ProductElementTypeAlias '{Alias}' is not a valid Element Type", alias);
            return Task.FromResult<IContentType?>(null);
        }

        return Task.FromResult<IContentType?>(contentType);
    }

    /// <summary>
    /// Serializes element property values to JSON for storage.
    /// </summary>
    public string SerializeElementProperties(Dictionary<string, object?> properties)
        => JsonSerializer.Serialize(properties, JsonOptions);

    /// <summary>
    /// Deserializes element property values from JSON storage.
    /// </summary>
    public Dictionary<string, object?> DeserializeElementProperties(string? json)
        => string.IsNullOrEmpty(json)
            ? new Dictionary<string, object?>()
            : JsonSerializer.Deserialize<Dictionary<string, object?>>(json, JsonOptions)
              ?? new Dictionary<string, object?>();

    /// <summary>
    /// Gets a ProductRoot by its RootUrl for front-end routing.
    /// </summary>
    public async Task<ProductRoot?> GetByRootUrlAsync(string rootUrl, CancellationToken ct = default)
    {
        var normalizedUrl = rootUrl.ToLowerInvariant();
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.RootProducts
                .Include(pr => pr.Products)
                .AsNoTracking()
                .FirstOrDefaultAsync(pr => pr.RootUrl == normalizedUrl, ct));
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Gets available product views from configured view locations.
    /// Discovers both physical .cshtml files and precompiled views from RCLs.
    /// </summary>
    public IReadOnlyList<ProductViewInfo> GetAvailableViews()
    {
        var views = new List<ProductViewInfo>();
        var locations = settings.Value.ProductViewLocations;

        // Scan file system for physical .cshtml files
        foreach (var location in locations)
        {
            var relativePath = location.TrimStart('~').TrimStart('/');
            var physicalPath = Path.Combine(webHostEnvironment.ContentRootPath, relativePath);

            if (Directory.Exists(physicalPath))
            {
                var files = Directory.GetFiles(physicalPath, "*.cshtml", SearchOption.TopDirectoryOnly);
                foreach (var file in files)
                {
                    var fileName = Path.GetFileNameWithoutExtension(file);
                    var virtualPath = $"~/{relativePath}/{fileName}.cshtml";
                    views.Add(new ProductViewInfo(fileName, virtualPath));
                }
            }
        }

        // Also check precompiled views from RCLs
        var feature = new ViewsFeature();
        partManager.PopulateFeature(feature);

        foreach (var descriptor in feature.ViewDescriptors)
        {
            if (locations.Any(loc =>
                descriptor.RelativePath.StartsWith(loc.TrimStart('~'), StringComparison.OrdinalIgnoreCase)))
            {
                var alias = Path.GetFileNameWithoutExtension(descriptor.RelativePath);
                if (!views.Any(v => v.Alias.Equals(alias, StringComparison.OrdinalIgnoreCase)))
                {
                    views.Add(new ProductViewInfo(alias, descriptor.RelativePath));
                }
            }
        }

        return views
            .DistinctBy(v => v.Alias, StringComparer.OrdinalIgnoreCase)
            .OrderBy(v => v.Alias)
            .ToList();
    }

    #endregion
}

// Temporary compatibility: remove once legacy using directive is cleaned.
