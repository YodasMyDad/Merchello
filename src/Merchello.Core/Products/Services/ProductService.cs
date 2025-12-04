using Merchello.Core.Accounting.Models;
using Merchello.Core.Data;
using Merchello.Core.Products.Factories;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Parameters;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Products.ExtensionMethods;
using Merchello.Core.Products.Mapping;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Warehouses.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Products.Services;

public class ProductService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    ProductRootFactory productRootFactory,
    ProductFactory productFactory,
    ProductOptionFactory productOptionFactory,
    SlugHelper slugHelper,
    ILogger<ProductService> logger) : IProductService
{
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
                    CreateVariantsNew(db, productRootDb, productTemplate!.Price, productTemplate.CostOfGoods,
                        productTemplate.Gtin ?? "", productTemplate.Sku ?? "");

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
                CreateVariantsNew(db, productRoot, price, costOfGoods, gtin, sku);
            }
            else
            {
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

            if (!productRoot.ProductOptions.Any(o => o.IsVariant))
            {
                result.AddErrorMessage("Cannot generate variants without variant options");
                return;
            }

            if (productRoot.Products.Any())
            {
                db.Products.RemoveRange(productRoot.Products);
            }

            CreateVariantsNew(db, productRoot, defaultPrice, defaultCostOfGoods, "", "");
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            generatedVariants = await db.Products
                .Where(p => p.ProductRootId == productRootId)
                .ToListAsync(cancellationToken);
        });

        scope.Complete();
        result.ResultObject = generatedVariants;
        return result;
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
    /// Creates new variants from the product options
    /// </summary>
    private void CreateVariantsNew(MerchelloDbContext db, ProductRoot productRoot, decimal price, decimal costOfGoods, string gtin, string sku)
    {
        // Create the different versions of the product from the product options
        var variantOptions = productRoot.ProductOptions
            .Where(o => o.IsVariant)
            .Select(option => option.ProductOptionValues)
            .CartesianObjects()
            .ToList();

        for (var index = 0; index < variantOptions.Count; index++)
        {
            var variantOption = variantOptions[index];
            var variantKeyName = variantOption.GenerateVariantKeyName();
            var product = productFactory.Create(productRoot, $"{productRoot.RootName} - {variantKeyName.Name}", price,
                costOfGoods, gtin, sku,
                index == 0, variantKeyName.Key);
            // Save the product
            db.Products.Add(product);
        }
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
            var variant = await db.Products
                .FirstOrDefaultAsync(p => p.Id == variantId, cancellationToken);

            if (variant == null)
            {
                result.AddErrorMessage("Variant not found");
                return;
            }

            // Fetch siblings
            var siblings = await db.Products
                .Where(p => p.ProductRootId == variant.ProductRootId)
                .ToListAsync(cancellationToken);

            foreach (var v in siblings)
            {
                v.Default = v.Id == variantId;
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

            if (parameters.NoTracking)
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
}

// Temporary compatibility: remove once legacy using directive is cleaned.
