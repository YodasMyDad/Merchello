using System.Text.Json;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Data;
using Merchello.Core.DigitalProducts.Extensions;
using Merchello.Core.DigitalProducts.Models;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Notifications.Product;
using Merchello.Core.Products.Dtos;
using Merchello.Core.Products.Factories;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Parameters;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Products.Extensions;
using Merchello.Core.Shipping.Models;
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
    IMerchelloNotificationPublisher notificationPublisher,
    IOptions<MerchelloSettings> settings,
    ILogger<ProductService> logger) : IProductService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    /// <summary>
    /// Updates stock levels for a variant at a specific warehouse.
    /// If stock changes affect availability (goes to 0 or becomes available from 0),
    /// triggers automatic reassignment to ensure the default variant is available.
    /// </summary>
    public async Task<CrudResult<bool>> UpdateVariantStock(
        UpdateVariantStockParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();
        using var scope = efCoreScopeProvider.CreateScope();

        var shouldCheckDefaultReassignment = false;
        Guid? productRootId = null;

        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var productWarehouse = await db.ProductWarehouses
                .Include(pw => pw.Product)
                .FirstOrDefaultAsync(pw => pw.ProductId == parameters.VariantId && pw.WarehouseId == parameters.WarehouseId, cancellationToken);

            if (productWarehouse == null)
            {
                // Need to check the product separately for new warehouse assignments
                var product = await db.Products.FirstOrDefaultAsync(p => p.Id == parameters.VariantId, cancellationToken);

                productWarehouse = new ProductWarehouse
                {
                    ProductId = parameters.VariantId,
                    WarehouseId = parameters.WarehouseId,
                    Stock = parameters.Stock,
                    ReorderPoint = parameters.ReorderPoint,
                    TrackStock = parameters.TrackStock
                };
                db.ProductWarehouses.Add(productWarehouse);

                if (product != null && parameters.TrackStock)
                {
                    // Check if this is setting a default variant to 0 stock
                    if (product.Default && parameters.Stock == 0)
                    {
                        shouldCheckDefaultReassignment = true;
                        productRootId = product.ProductRootId;
                    }
                    // Check if a non-default variant is becoming available (new record with stock > 0)
                    else if (!product.Default && parameters.Stock > 0)
                    {
                        shouldCheckDefaultReassignment = true;
                        productRootId = product.ProductRootId;
                    }
                }
            }
            else
            {
                var oldStock = productWarehouse.Stock;
                var oldAvailable = oldStock - productWarehouse.ReservedStock;

                productWarehouse.Stock = parameters.Stock;
                productWarehouse.ReorderPoint = parameters.ReorderPoint;
                productWarehouse.TrackStock = parameters.TrackStock;

                if (parameters.TrackStock && productWarehouse.Product != null)
                {
                    var newAvailable = parameters.Stock - productWarehouse.ReservedStock;

                    // Check if default variant becoming unavailable (stock going to 0)
                    if (productWarehouse.Product.Default && newAvailable <= 0)
                    {
                        shouldCheckDefaultReassignment = true;
                        productRootId = productWarehouse.Product.ProductRootId;
                    }
                    // Check if non-default variant becoming available (was 0, now > 0)
                    else if (!productWarehouse.Product.Default && oldAvailable <= 0 && newAvailable > 0)
                    {
                        shouldCheckDefaultReassignment = true;
                        productRootId = productWarehouse.Product.ProductRootId;
                    }
                }
            }

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            logger.LogDebug(
                "UpdateVariantStock: Variant {VariantId}, Warehouse {WarehouseId}, Stock {Stock}, TrackStock {TrackStock}",
                parameters.VariantId, parameters.WarehouseId, parameters.Stock, parameters.TrackStock);

            result.ResultObject = true;
            return true;
        });

        scope.Complete();

        // After scope completes, check if we need to reassign default
        if (shouldCheckDefaultReassignment && productRootId.HasValue)
        {
            await EnsureDefaultVariantIsAvailableAsync(productRootId.Value, cancellationToken);
        }

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
            .OrderBy(o => o.SortOrder)
            .ThenBy(o => o.Id)
            .Select(option => option.ProductOptionValues
                .OrderBy(v => v.SortOrder)
                .ThenBy(v => v.Id))
            .CartesianObjects()
            .ToList();

        // Pre-generate all SKUs to check for duplicates
        List<(IEnumerable<ProductOptionValue> Options, string Name, string Sku)> variantData = [];
        for (var index = 0; index < variantOptions.Count; index++)
        {
            var variantOption = variantOptions[index];
            var variantKeyName = variantOption.GenerateVariantKeyName();
            var variantName = variantKeyName.Name;
            var skuBase = $"{productRoot.RootName} - {variantKeyName.Name}";
            var variantSku = GenerateVariantSku(skuBase, baseSku);
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
                .Include(pr => pr.Collections)
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
    /// Gets multiple product roots by their IDs in a single batch query.
    /// </summary>
    public async Task<List<ProductRoot>> GetProductRootsByIds(IEnumerable<Guid> productRootIds, CancellationToken cancellationToken = default)
    {
        var ids = productRootIds.ToList();
        if (ids.Count == 0) return [];

        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.RootProducts
                .AsNoTracking()
                .Include(pr => pr.Collections)
                .Include(pr => pr.ProductType)
                .Include(pr => pr.TaxGroup)
                .Where(pr => ids.Contains(pr.Id))
                .ToListAsync(cancellationToken));
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

        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var variants = await db.Products
                .Include(p => p.ExcludedShippingOptions)
                .Where(p => p.Id == variantId)
                .ToListAsync(cancellationToken);

            return await UpdateShippingExclusionsAsync(
                db,
                variants,
                excludedShippingOptionIds,
                result,
                "Variant not found",
                cancellationToken);
        });

        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<List<ShippingOptionExclusionDto>?> GetAvailableShippingOptionsAsync(
        Guid productRootId,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();

        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var productRoot = await db.RootProducts
                .Include(pr => pr.ProductRootWarehouses)
                    .ThenInclude(prw => prw.Warehouse)
                        .ThenInclude(w => w!.ShippingOptions)
                .Include(pr => pr.Products)
                    .ThenInclude(p => p.ExcludedShippingOptions)
                .AsNoTracking()
                .AsSplitQuery()
                .FirstOrDefaultAsync(pr => pr.Id == productRootId, cancellationToken);

            if (productRoot == null) return null;

            // Get all shipping options from assigned warehouses
            var warehouseOptions = productRoot.ProductRootWarehouses
                .SelectMany(prw => prw.Warehouse?.ShippingOptions ?? [])
                .DistinctBy(so => so.Id)
                .ToList();

            // Calculate exclusion counts across ALL variants
            var totalVariants = productRoot.Products.Count;
            var exclusionCounts = productRoot.Products
                .SelectMany(p => p.ExcludedShippingOptions.Select(eso => eso.Id))
                .GroupBy(id => id)
                .ToDictionary(g => g.Key, g => g.Count());

            return warehouseOptions.Select(so =>
            {
                var excludedCount = exclusionCounts.GetValueOrDefault(so.Id, 0);
                return new ShippingOptionExclusionDto
                {
                    Id = so.Id,
                    Name = so.Name,
                    WarehouseName = so.Warehouse?.Name,
                    ProviderKey = so.ProviderKey,
                    IsExcluded = excludedCount == totalVariants,
                    IsPartiallyExcluded = excludedCount > 0 && excludedCount < totalVariants,
                    ExcludedVariantCount = excludedCount,
                    TotalVariantCount = totalVariants
                };
            }).ToList();
        });

        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<bool>> UpdateProductRootExcludedShippingOptionsAsync(
        Guid productRootId,
        List<Guid> excludedShippingOptionIds,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();
        using var scope = efCoreScopeProvider.CreateScope();

        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            // Get all variants for this product root
            var variants = await db.Products
                .Include(p => p.ExcludedShippingOptions)
                .Where(p => p.ProductRootId == productRootId)
                .ToListAsync(cancellationToken);

            return await UpdateShippingExclusionsAsync(
                db,
                variants,
                excludedShippingOptionIds,
                result,
                "Product not found",
                cancellationToken);
        });

        scope.Complete();
        return result;
    }

    private async Task<bool> UpdateShippingExclusionsAsync(
        MerchelloDbContext db,
        IReadOnlyCollection<Product> variants,
        IReadOnlyCollection<Guid> excludedShippingOptionIds,
        CrudResult<bool> result,
        string notFoundMessage,
        CancellationToken cancellationToken)
    {
        if (variants.Count == 0)
        {
            result.AddErrorMessage(notFoundMessage);
            return false;
        }

        // Load shipping options to exclude
        var optionsToExclude = await db.ShippingOptions
            .Where(so => excludedShippingOptionIds.Contains(so.Id))
            .ToListAsync(cancellationToken);

        // Apply exclusions to variants (single or bulk)
        ApplyShippingExclusions(variants, optionsToExclude);

        await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
        result.ResultObject = result.Success;
        return result.Success;
    }

    private static void ApplyShippingExclusions(
        IEnumerable<Product> variants,
        IReadOnlyCollection<ShippingOption> optionsToExclude)
    {
        var restrictionMode = optionsToExclude.Count > 0
            ? ShippingRestrictionMode.ExcludeList
            : ShippingRestrictionMode.None;

        foreach (var variant in variants)
        {
            variant.ShippingRestrictionMode = restrictionMode;
            variant.ExcludedShippingOptions.Clear();
            foreach (var option in optionsToExclude)
            {
                variant.ExcludedShippingOptions.Add(option);
            }
        }
    }

    /// <summary>
    /// Sets the default variant for a product root, ensuring only one default is set.
    /// Validates that the target variant is available before setting as default.
    /// </summary>
    public async Task<CrudResult<bool>> SetDefaultVariant(
        Guid variantId,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();
        using var scope = efCoreScopeProvider.CreateScope();

        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            // Find the variant with warehouse stock data for availability check
            var targetVariant = await db.Products
                .Include(p => p.ProductWarehouses)
                .FirstOrDefaultAsync(p => p.Id == variantId, cancellationToken);

            if (targetVariant == null)
            {
                result.AddErrorMessage("Variant not found");
                return false;
            }

            // Validate the variant is available before setting as default
            if (!IsVariantAvailable(targetVariant))
            {
                result.AddErrorMessage("Cannot set an unavailable variant as the default. The variant must be available for purchase and have stock (if tracked).");
                return false;
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
            return true;
        });

        scope.Complete();
        return result;
    }

    /// <summary>
    /// Checks if the current default variant is available. If not, reassigns to the
    /// cheapest available variant. Called automatically when stock or availability changes.
    /// </summary>
    public async Task<CrudResult<bool>> EnsureDefaultVariantIsAvailableAsync(
        Guid productRootId,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();
        using var scope = efCoreScopeProvider.CreateScope();

        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            // Get all variants with their warehouse stock
            var variants = await db.Products
                .Include(p => p.ProductWarehouses)
                .Where(p => p.ProductRootId == productRootId)
                .ToListAsync(cancellationToken);

            if (variants.Count <= 1)
            {
                // Single product or no variants - nothing to reassign
                result.ResultObject = true;
                return false;
            }

            var currentDefault = variants.FirstOrDefault(v => v.Default);
            if (currentDefault == null)
            {
                result.ResultObject = true;
                return false;
            }

            // Check if current default is available
            if (IsVariantAvailable(currentDefault))
            {
                result.ResultObject = true;
                return false;
            }

            // Find cheapest available variant
            var newDefault = variants
                .Where(v => v.Id != currentDefault.Id && IsVariantAvailable(v))
                .OrderBy(v => v.Price)
                .FirstOrDefault();

            if (newDefault == null)
            {
                // No available variants - keep current default
                logger.LogDebug(
                    "Default variant {VariantId} is unavailable but no alternatives exist for product {ProductRootId}",
                    currentDefault.Id, productRootId);
                result.ResultObject = true;
                return false;
            }

            // Reassign default
            currentDefault.Default = false;
            newDefault.Default = true;
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            logger.LogInformation(
                "Reassigned default variant from {OldVariantId} to {NewVariantId} for product {ProductRootId}",
                currentDefault.Id, newDefault.Id, productRootId);

            result.ResultObject = true;
            return true;
        });

        scope.Complete();
        return result;
    }

    /// <summary>
    /// Checks if a variant is available for purchase based on availability flags and stock.
    /// </summary>
    private static bool IsVariantAvailable(Product variant)
    {
        if (!variant.AvailableForPurchase || !variant.CanPurchase)
            return false;

        var trackedWarehouses = variant.ProductWarehouses?.Where(pw => pw.TrackStock).ToList();

        // If no tracked warehouses, variant is available (untracked inventory)
        if (trackedWarehouses == null || trackedWarehouses.Count == 0)
            return true;

        // Check if any tracked warehouse has available stock
        return trackedWarehouses.Any(pw => pw.Stock - pw.ReservedStock > 0);
    }

    /// <summary>
    /// Applies ordering to product query based on OrderBy parameter.
    /// Note: Popularity ordering is handled separately in QueryProducts.
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
            // Popularity is handled in QueryProducts, fallback to DateCreated for non-popularity paths
            ProductOrderBy.Popularity => query.OrderByDescending(p => p.DateCreated),
            // WarehousePriority is handled in QueryProductsSummary, fallback to ProductRoot for other paths
            ProductOrderBy.WarehousePriority => query.OrderBy(p => p.ProductRoot.RootName),
            _ => query.OrderBy(p => p.Name)
        };
    }

    /// <summary>
    /// Gets product IDs ordered by popularity (total quantity sold) for a given date range.
    /// </summary>
    /// <param name="db">Database context</param>
    /// <param name="validProductIds">Query of valid product IDs to filter by</param>
    /// <param name="fromDate">Start date for sales aggregation (inclusive)</param>
    /// <param name="toDate">End date for sales aggregation (inclusive)</param>
    /// <param name="skip">Number of items to skip for pagination</param>
    /// <param name="take">Number of items to take for pagination</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of product IDs ordered by popularity (most sold first)</returns>
    private static async Task<List<Guid>> GetProductIdsByPopularityAsync(
        MerchelloDbContext db,
        IQueryable<Guid> validProductIds,
        DateTime? fromDate,
        DateTime? toDate,
        int skip,
        int take,
        CancellationToken cancellationToken)
    {
        // Build line items query for completed orders with product line items
        var lineItemsQuery = db.LineItems
            .Where(li => li.LineItemType == LineItemType.Product)
            .Where(li => li.ProductId != null)
            .Where(li => validProductIds.Contains(li.ProductId!.Value))
            .Where(li => li.Order != null && li.Order.Status == OrderStatus.Completed);

        // Apply date range filter on order creation date (when sale was made)
        // Using DateCreated rather than CompletedDate as it's always set and represents when the sale occurred
        if (fromDate.HasValue)
        {
            lineItemsQuery = lineItemsQuery.Where(li => li.Order!.DateCreated >= fromDate.Value);
        }
        if (toDate.HasValue)
        {
            lineItemsQuery = lineItemsQuery.Where(li => li.Order!.DateCreated <= toDate.Value);
        }

        // Aggregate sales by ProductId and order by total quantity descending
        var popularProductIds = await lineItemsQuery
            .GroupBy(li => li.ProductId!.Value)
            .Select(g => new { ProductId = g.Key, TotalQuantity = g.Sum(li => li.Quantity) })
            .OrderByDescending(x => x.TotalQuantity)
            .Skip(skip)
            .Take(take)
            .Select(x => x.ProductId)
            .ToListAsync(cancellationToken);

        return popularProductIds;
    }

    /// <summary>
    /// Gets the total count of products that have sales data.
    /// </summary>
    private static async Task<int> GetPopularProductsCountAsync(
        MerchelloDbContext db,
        IQueryable<Guid> validProductIds,
        DateTime? fromDate,
        DateTime? toDate,
        CancellationToken cancellationToken)
    {
        var lineItemsQuery = db.LineItems
            .Where(li => li.LineItemType == LineItemType.Product)
            .Where(li => li.ProductId != null)
            .Where(li => validProductIds.Contains(li.ProductId!.Value))
            .Where(li => li.Order != null && li.Order.Status == OrderStatus.Completed);

        // Using DateCreated for consistency with GetProductIdsByPopularityAsync
        if (fromDate.HasValue)
        {
            lineItemsQuery = lineItemsQuery.Where(li => li.Order!.DateCreated >= fromDate.Value);
        }
        if (toDate.HasValue)
        {
            lineItemsQuery = lineItemsQuery.Where(li => li.Order!.DateCreated <= toDate.Value);
        }

        return await lineItemsQuery
            .Select(li => li.ProductId)
            .Distinct()
            .CountAsync(cancellationToken);
    }

    /// <summary>
    /// Updates, adds and removes the collections on the product root
    /// </summary>
    /// <param name="db">Database context</param>
    /// <param name="updatedProductRoot">Updated product root with new collections</param>
    /// <param name="productRootDb">Existing product root from database</param>
    private void UpdateCollections(MerchelloDbContext db, ProductRoot updatedProductRoot, ProductRoot productRootDb)
    {
        if (updatedProductRoot.Collections.Any())
        {
            if (productRootDb.Collections.Any())
            {
                // We have collections, so we need to check which ones to add and remove
                var itemsToRemove = productRootDb.Collections
                    .ExceptBy(updatedProductRoot.Collections.Select(x => x.Id), x => x.Id)
                    .ToList();
                foreach (var productCollection in itemsToRemove)
                {
                    productRootDb.Collections.Remove(productCollection);
                }

                var itemsToAdd =
                    updatedProductRoot.Collections.ExceptBy(productRootDb.Collections.Select(x => x.Id), x => x.Id);
                foreach (var productCollection in itemsToAdd)
                {
                    productRootDb.Collections.Add(productCollection);
                }
            }
            else
            {
                foreach (var productRootCollection in updatedProductRoot.Collections)
                {
                    var dbCol = db.ProductCollections.FirstOrDefault(x => x.Id == productRootCollection.Id);
                    if (dbCol != null)
                    {
                        productRootDb.Collections.Add(dbCol);
                    }
                }
            }
        }
        else
        {
            // Should we use clear? Or should we loop and remove()
            productRootDb.Collections.Clear();
        }
    }



    /// <summary>
    /// Gets the min and max price for products in a collection using SQL aggregation.
    /// More efficient than loading all products into memory.
    /// </summary>
    public async Task<(decimal MinPrice, decimal MaxPrice)> GetPriceRangeForCollection(Guid collectionId, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var prices = await db.Products
                .Where(p => p.ProductRoot.Collections.Any(c => c.Id == collectionId))
                .Where(p => p.AvailableForPurchase && p.CanPurchase)
                .Where(p => p.Default) // Only default variants for consistency
                .Select(p => p.Price)
                .ToListAsync(cancellationToken);

            if (prices.Count == 0)
            {
                return (0m, 1000m); // Default range if no products
            }

            return (prices.Min(), prices.Max());
        });
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
                            .ThenInclude(p => p.ProductWarehouses)
                                .ThenInclude(pw => pw.Warehouse)
                                    ;

                    query = query.Include(p => p.ProductRoot)
                        .ThenInclude(pr => pr!.Products)
                            .ThenInclude(p => p.ProductWarehouses)
                                .ThenInclude(pw => pw.Warehouse)
                                    .ThenInclude(w => w.ShippingOptions)
                                        ;
                }
            }

            if (parameters.IncludeTaxGroup && parameters.IncludeProductRoot)
            {
                query = query.Include(p => p.ProductRoot)
                    .ThenInclude(pr => pr!.TaxGroup);
            }

            // Note: ProductOptions is a JSON column on ProductRoot, automatically loaded when ProductRoot is included

            if (parameters.IncludeProductWarehouses)
            {
                query = query
                    .Include(p => p.ProductWarehouses)
                        .ThenInclude(pw => pw.Warehouse)
                            ;

                query = query
                    .Include(p => p.ProductWarehouses)
                        .ThenInclude(pw => pw.Warehouse)
                            .ThenInclude(w => w.ShippingOptions)
                                ;
            }

            if (parameters.IncludeShippingRestrictions)
            {
                query = query
                    .Include(p => p.AllowedShippingOptions)
                    .Include(p => p.ExcludedShippingOptions);
            }

            if (parameters.IncludeProductRootWarehouses && parameters.IncludeProductRoot)
            {
                query = query.Include(p => p.ProductRoot)
                    .ThenInclude(pr => pr!.ProductRootWarehouses)
                    .ThenInclude(prw => prw.Warehouse)
                    ;

                query = query.Include(p => p.ProductRoot)
                    .ThenInclude(pr => pr!.ProductRootWarehouses)
                    .ThenInclude(prw => prw.Warehouse)
                    .ThenInclude(w => w!.ShippingOptions)
                    ;
            }

            // Note: Cannot use NoTracking with circular references (ProductRoot->Products creates a cycle)
            // Only apply NoTracking if we're not including variants
            if (parameters.NoTracking && !parameters.IncludeVariants)
            {
                query = query.AsNoTracking();
            }

            // Use split query when including multiple collection navigations to avoid Cartesian explosion
            if (parameters.IncludeProductWarehouses || parameters.IncludeProductRootWarehouses || parameters.IncludeShippingRestrictions)
            {
                query = query.AsSplitQuery();
            }

            var product = await query.FirstOrDefaultAsync(p => p.Id == parameters.ProductId, cancellationToken);

            // Explicitly populate warehouse shipping data to work around EF Core NoTracking issue
            // where multiple ThenInclude branches from the same entity don't merge properly.
            // This mirrors the pattern used in GetByRootUrlAsync for consistency.
            if (product != null && (parameters.IncludeProductWarehouses || parameters.IncludeProductRootWarehouses))
            {
                var warehouseIds = new HashSet<Guid>();

                if (parameters.IncludeProductWarehouses && product.ProductWarehouses != null)
                {
                    foreach (var pw in product.ProductWarehouses.Where(pw => pw.Warehouse != null))
                    {
                        warehouseIds.Add(pw.Warehouse!.Id);
                    }
                }

                if (parameters.IncludeProductRootWarehouses && product.ProductRoot?.ProductRootWarehouses != null)
                {
                    foreach (var prw in product.ProductRoot.ProductRootWarehouses.Where(prw => prw.Warehouse != null))
                    {
                        warehouseIds.Add(prw.Warehouse!.Id);
                    }
                }

                if (warehouseIds.Count > 0)
                {
                    var warehousesWithData = await db.Warehouses
                        
                        .Include(w => w.ShippingOptions)
                            
                        .Where(w => warehouseIds.Contains(w.Id))
                        .AsNoTracking()
                        .ToDictionaryAsync(w => w.Id, cancellationToken);

                    // Populate on ProductWarehouses
                    if (parameters.IncludeProductWarehouses && product.ProductWarehouses != null)
                    {
                        foreach (var pw in product.ProductWarehouses.Where(pw => pw.Warehouse != null))
                        {
                            if (warehousesWithData.TryGetValue(pw.Warehouse!.Id, out var fullWarehouse))
                            {
                                pw.Warehouse.SetServiceRegions(fullWarehouse.ServiceRegions);
                                pw.Warehouse.ShippingOptions = fullWarehouse.ShippingOptions;
                            }
                        }
                    }

                    // Populate on ProductRootWarehouses
                    if (parameters.IncludeProductRootWarehouses && product.ProductRoot?.ProductRootWarehouses != null)
                    {
                        foreach (var prw in product.ProductRoot.ProductRootWarehouses.Where(prw => prw.Warehouse != null))
                        {
                            if (warehousesWithData.TryGetValue(prw.Warehouse!.Id, out var fullWarehouse))
                            {
                                prw.Warehouse.SetServiceRegions(fullWarehouse.ServiceRegions);
                                prw.Warehouse.ShippingOptions = fullWarehouse.ShippingOptions;
                            }
                        }
                    }
                }
            }

            return product;
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
    private static IQueryable<Product> BuildBaseProductQuery(MerchelloDbContext db, ProductQueryParameters parameters)
    {
        IQueryable<Product> baseQuery = db.Products;

        var productTypeKeys = new HashSet<Guid>();
        if (parameters.ProductTypeKey.HasValue)
            productTypeKeys.Add(parameters.ProductTypeKey.Value);
        if (parameters.ProductTypeKeys?.Any() == true)
            productTypeKeys.UnionWith(parameters.ProductTypeKeys);

        if (productTypeKeys.Count > 0)
        {
            baseQuery = baseQuery.Where(x => productTypeKeys.Contains(x.ProductRoot.ProductTypeId));
        }

        var productRootKeys = new HashSet<Guid>();
        if (parameters.ProductRootKey.HasValue)
            productRootKeys.Add(parameters.ProductRootKey.Value);
        if (parameters.ProductRootKeys?.Any() == true)
            productRootKeys.UnionWith(parameters.ProductRootKeys);

        if (parameters.ProductIds?.Any() == true && productRootKeys.Count > 0)
        {
            baseQuery = baseQuery.Where(x =>
                parameters.ProductIds.Contains(x.Id) || productRootKeys.Contains(x.ProductRootId));
        }
        else if (parameters.ProductIds?.Any() == true)
        {
            baseQuery = baseQuery.Where(x => parameters.ProductIds.Contains(x.Id));
        }
        else if (productRootKeys.Count > 0)
        {
            baseQuery = baseQuery.Where(x => productRootKeys.Contains(x.ProductRootId));
        }

        if (parameters.CollectionIds?.Any() == true)
        {
            baseQuery = baseQuery.Where(x => x.ProductRoot.Collections.Any(pc => parameters.CollectionIds.Contains(pc.Id)));
        }

        if (parameters.FilterKeys?.Any() == true)
        {
            baseQuery = baseQuery.Where(x => x.Filters.Any(pc => parameters.FilterKeys.Contains(pc.Id)));
        }

        if (parameters.SupplierIds?.Any() == true)
        {
            baseQuery = baseQuery.Where(x =>
                x.ProductRoot.ProductRootWarehouses.Any(prw =>
                    prw.Warehouse != null &&
                    prw.Warehouse.SupplierId.HasValue &&
                    parameters.SupplierIds.Contains(prw.Warehouse.SupplierId.Value)) ||
                x.ProductWarehouses.Any(pw =>
                    pw.Warehouse != null &&
                    pw.Warehouse.SupplierId.HasValue &&
                    parameters.SupplierIds.Contains(pw.Warehouse.SupplierId.Value)));
        }

        if (!string.IsNullOrWhiteSpace(parameters.Search))
        {
            var searchLower = parameters.Search.ToLower();
            baseQuery = baseQuery.Where(x =>
                (x.ProductRoot.RootName != null && x.ProductRoot.RootName.ToLower().Contains(searchLower)) ||
                (x.Sku != null && x.Sku.ToLower().Contains(searchLower)));
        }

        if (parameters.AvailabilityFilter == ProductAvailabilityFilter.Available)
        {
            baseQuery = baseQuery.Where(x => x.AvailableForPurchase && x.CanPurchase);
        }
        else if (parameters.AvailabilityFilter == ProductAvailabilityFilter.Unavailable)
        {
            baseQuery = baseQuery.Where(x => !x.AvailableForPurchase || !x.CanPurchase);
        }

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

        if (parameters.MinPrice.HasValue)
        {
            baseQuery = baseQuery.Where(x => x.Price >= parameters.MinPrice.Value);
        }

        if (parameters.MaxPrice.HasValue)
        {
            baseQuery = baseQuery.Where(x => x.Price <= parameters.MaxPrice.Value);
        }

        if (parameters.WarehouseId.HasValue)
        {
            baseQuery = baseQuery.Where(x =>
                x.ProductRoot.ProductRootWarehouses.Any(prw => prw.WarehouseId == parameters.WarehouseId.Value));
        }

        return baseQuery;
    }

    public async Task<PaginatedList<Product>> QueryProducts(ProductQueryParameters parameters, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            // Build a base query without Includes; apply Includes only when materializing items.
            var baseQuery = BuildBaseProductQuery(db, parameters);

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

            List<Guid> orderedIds;
            int totalCount;

            // Handle Popularity ordering specially - requires aggregating sales data
            if (parameters.OrderBy == ProductOrderBy.Popularity)
            {
                var validProductIds = resultQuery.Select(x => x.Id);

                // Get count of products with sales
                totalCount = await GetPopularProductsCountAsync(
                    db,
                    validProductIds,
                    parameters.PopularityFromDate,
                    parameters.PopularityToDate,
                    cancellationToken);

                // Get popular product IDs ordered by sales
                orderedIds = await GetProductIdsByPopularityAsync(
                    db,
                    validProductIds,
                    parameters.PopularityFromDate,
                    parameters.PopularityToDate,
                    pageIndex * pageSize,
                    pageSize,
                    cancellationToken);

                // Fallback when there is no sales data (e.g., fresh catalog)
                if (orderedIds.Count == 0)
                {
                    totalCount = await resultQuery.Select(x => x.Id).CountAsync(cancellationToken: cancellationToken);
                    var orderedQuery = ApplyOrdering(resultQuery, ProductOrderBy.PriceAsc);
                    orderedIds = await orderedQuery
                        .Skip(pageIndex * pageSize)
                        .Take(pageSize)
                        .Select(x => x.Id)
                        .ToListAsync(cancellationToken: cancellationToken);
                }
            }
            else
            {
                // Standard ordering - count and paginate normally
                totalCount = await resultQuery.Select(x => x.Id).CountAsync(cancellationToken: cancellationToken);

                var orderedQuery = ApplyOrdering(resultQuery, parameters.OrderBy);
                orderedIds = await orderedQuery
                    .Skip(pageIndex * pageSize)
                    .Take(pageSize)
                    .Select(x => x.Id)
                    .ToListAsync(cancellationToken: cancellationToken);
            }

            // If no results, return empty
            if (orderedIds.Count == 0)
            {
                return new PaginatedList<Product>([], totalCount, parameters.CurrentPage, parameters.AmountPerPage);
            }

            // Materialize items with requested Includes
            IQueryable<Product> itemsQuery = db.Products
                .Where(p => orderedIds.Contains(p.Id));
            itemsQuery = itemsQuery
                .Include(x => x.ProductRoot)
                .ThenInclude(x => x.Collections);
            itemsQuery = itemsQuery
                .Include(x => x.ProductRoot)
                .ThenInclude(x => x.ProductType);

            if (parameters.IncludeProductFilters || parameters.FilterKeys?.Any() == true)
            {
                itemsQuery = itemsQuery.Include(x => x.Filters);
            }

            if (parameters.IncludeProductWarehouses)
            {
                itemsQuery = itemsQuery
                    .Include(x => x.ProductWarehouses)
                        .ThenInclude(pw => pw.Warehouse)
                            ;

                itemsQuery = itemsQuery
                    .Include(x => x.ProductWarehouses)
                        .ThenInclude(pw => pw.Warehouse)
                            .ThenInclude(w => w.ShippingOptions)
                                ;
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
                    ;

                itemsQuery = itemsQuery.Include(x => x.ProductRoot)
                    .ThenInclude(x => x.ProductRootWarehouses)
                    .ThenInclude(prw => prw.Warehouse)
                    .ThenInclude(w => w!.ShippingOptions)
                    ;
            }

            // Note: Cannot use NoTracking with circular references (ProductRoot->Products creates a cycle)
            // Only apply NoTracking if we're not including sibling variants
            if (parameters.NoTracking && !parameters.IncludeSiblingVariants)
            {
                itemsQuery = itemsQuery.AsNoTracking();
            }

            var materializedItems = await itemsQuery.ToListAsync(cancellationToken: cancellationToken);

            // Preserve the ordering from orderedIds (important for Popularity ordering)
            var items = orderedIds
                .Select(id => materializedItems.FirstOrDefault(p => p.Id == id))
                .Where(p => p != null)
                .Cast<Product>()
                .ToList();

            return new PaginatedList<Product>(items, totalCount, parameters.CurrentPage, parameters.AmountPerPage);
        });
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Query products returning summary DTOs for list views.
    /// Uses database projection for better performance.
    /// </summary>
    public async Task<PaginatedList<ProductListItemDto>> QueryProductsSummary(ProductQueryParameters parameters, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            // Build filtered base query (shared with QueryProducts)
            var baseQuery = BuildBaseProductQuery(db, parameters);

            // Only default variants for the list view
            var resultQuery = baseQuery.Where(x => x.Default);

            // Paging
            var pageIndex = parameters.CurrentPage - 1;
            var pageSize = parameters.AmountPerPage;

            // Get total count
            var totalCount = await resultQuery.CountAsync(cancellationToken);

            if (totalCount == 0)
            {
                return new PaginatedList<ProductListItemDto>([], 0, parameters.CurrentPage, parameters.AmountPerPage);
            }

            // Apply ordering - special handling for WarehousePriority
            IQueryable<Product> orderedQuery;
            if (parameters.OrderBy == ProductOrderBy.WarehousePriority && parameters.WarehouseId.HasValue)
            {
                // Order by warehouse priority then by name
                var warehouseId = parameters.WarehouseId.Value;
                orderedQuery = resultQuery
                    .OrderBy(p => p.ProductRoot.ProductRootWarehouses
                        .Where(prw => prw.WarehouseId == warehouseId)
                        .Select(prw => prw.PriorityOrder)
                        .FirstOrDefault())
                    .ThenBy(p => p.ProductRoot.RootName);
            }
            else
            {
                orderedQuery = ApplyOrdering(resultQuery, parameters.OrderBy);
            }

            // Project directly to DTO with database-level aggregations
            // Note: MinPrice/MaxPrice use placeholder - we calculate them in a separate query
            // to avoid Umbraco SQLite wrapper issues with ef_min/ef_max/EF_DECIMAL
            var items = await orderedQuery
                .Skip(pageIndex * pageSize)
                .Take(pageSize)
                .Select(p => new ProductListItemDto
                {
                    Id = p.Id,
                    ProductRootId = p.ProductRootId,
                    RootName = p.ProductRoot.RootName ?? p.Name ?? "Unknown",
                    Sku = db.Products.Count(v => v.ProductRootId == p.ProductRootId) > 1
                        ? null
                        : p.Sku,
                    Price = p.Price,
                    VariantCount = db.Products.Count(v => v.ProductRootId == p.ProductRootId),
                    MinPrice = p.Price, // Placeholder - updated below
                    MaxPrice = p.Price, // Placeholder - updated below
                    HasWarehouse = db.ProductRootWarehouses
                        .Any(prw => prw.ProductRootId == p.ProductRootId),
                    HasShippingOptions = db.ProductRootWarehouses
                        .Where(prw => prw.ProductRootId == p.ProductRootId)
                        .Any(prw => prw.Warehouse!.ShippingOptions.Any()),
                    Purchaseable = p.AvailableForPurchase && p.CanPurchase,
                    ProductTypeName = p.ProductRoot.ProductType.Name ?? "",
                    CollectionNames = p.ProductRoot.Collections.Select(c => c.Name ?? "").ToList(),
                    ImageUrl = p.Images.FirstOrDefault() ?? p.ProductRoot.RootImages.FirstOrDefault(),
                    IsDigitalProduct = p.ProductRoot.IsDigitalProduct
                })
                .AsNoTracking()
                .ToListAsync(cancellationToken);

            // Get min/max prices: load only ProductRootId + Price, aggregate in memory
            // This avoids SQLite's ef_min/ef_max decimal function issues while staying efficient
            if (items.Count > 0)
            {
                var productRootIds = items.Select(x => x.ProductRootId).Distinct().ToList();

                // Load only 2 columns - very lightweight even for many variants
                var prices = await db.Products
                    .Where(p => productRootIds.Contains(p.ProductRootId))
                    .Select(p => new { p.ProductRootId, p.Price })
                    .AsNoTracking()
                    .ToListAsync(cancellationToken);

                // Aggregate in memory - fast for this small dataset
                var priceDict = prices
                    .GroupBy(p => p.ProductRootId)
                    .ToDictionary(
                        g => g.Key,
                        g => (Min: g.Min(p => p.Price), Max: g.Max(p => p.Price)));

                foreach (var item in items)
                {
                    if (priceDict.TryGetValue(item.ProductRootId, out var range))
                    {
                        item.MinPrice = range.Min;
                        item.MaxPrice = range.Max;
                    }
                }

                // Load PriorityOrder when filtering by warehouse
                if (parameters.WarehouseId.HasValue)
                {
                    var priorityDict = await db.ProductRootWarehouses
                        .Where(prw => prw.WarehouseId == parameters.WarehouseId.Value &&
                                      productRootIds.Contains(prw.ProductRootId))
                        .Select(prw => new { prw.ProductRootId, prw.PriorityOrder })
                        .AsNoTracking()
                        .ToDictionaryAsync(x => x.ProductRootId, x => x.PriorityOrder, cancellationToken);

                    foreach (var item in items)
                    {
                        if (priorityDict.TryGetValue(item.ProductRootId, out var priority))
                        {
                            item.PriorityOrder = priority;
                        }
                    }
                }
            }

            // Populate display labels from backend (source of truth)
            foreach (var item in items)
            {
                item.PurchaseStatusLabel = item.Purchaseable ? "Available" : "Unavailable";
                item.PurchaseStatusCssClass = item.Purchaseable ? "badge-positive" : "badge-danger";
            }

            return new PaginatedList<ProductListItemDto>(items, totalCount, parameters.CurrentPage, parameters.AmountPerPage);
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
                .Include(pr => pr.Collections)
                .Include(pr => pr.ProductRootWarehouses)
                    .ThenInclude(prw => prw.Warehouse)
                        .ThenInclude(w => w!.ShippingOptions)
                .Include(pr => pr.Products)
                    .ThenInclude(p => p.ProductWarehouses)
                        .ThenInclude(pw => pw.Warehouse)
                .Include(pr => pr.Products)
                    .ThenInclude(p => p.ExcludedShippingOptions)
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

        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var taxGroup = await db.TaxGroups.FindAsync([request.TaxGroupId], cancellationToken);
            if (taxGroup == null)
            {
                result.AddErrorMessage("Tax group not found");
                return false;
            }

            var productType = await db.ProductTypes.FindAsync([request.ProductTypeId], cancellationToken);
            if (productType == null)
            {
                result.AddErrorMessage("Product type not found");
                return false;
            }

            string? elementTypeAlias = null;
            if (!string.IsNullOrWhiteSpace(request.ElementTypeAlias))
            {
                elementTypeAlias = request.ElementTypeAlias.Trim();
                var elementType = await GetProductElementTypeAsync(elementTypeAlias, cancellationToken);
                if (elementType == null)
                {
                    result.AddErrorMessage($"Element Type '{elementTypeAlias}' not found or is not an Element Type");
                    return false;
                }
                elementTypeAlias = elementType.Alias;
            }
            else if (request.ElementProperties is { Count: > 0 })
            {
                result.AddErrorMessage("Element properties were provided without an Element Type selection");
                return false;
            }

            var collections = request.CollectionIds?.Any() == true
                ? await db.ProductCollections.Where(c => request.CollectionIds.Contains(c.Id)).ToListAsync(cancellationToken)
                : [];

            // Validate SKU uniqueness if one was provided
            if (!string.IsNullOrEmpty(request.DefaultVariant.Sku))
            {
                var skuExists = await db.Products.AnyAsync(p => p.Sku == request.DefaultVariant.Sku, cancellationToken);
                if (skuExists)
                {
                    result.AddErrorMessage($"SKU '{request.DefaultVariant.Sku}' already exists");
                    return false;
                }
            }

            productRoot = productRootFactory.Create(
                name: request.RootName,
                rootUrl: slugHelper.GenerateSlug(request.RootName),
                taxGroup: taxGroup,
                productType: productType,
                collections: collections,
                isDigitalProduct: request.IsDigitalProduct,
                rootImages: request.RootImages?.Select(g => g.ToString()).ToList());

            if (!string.IsNullOrWhiteSpace(request.GoogleShoppingFeedCategory))
            {
                productRoot.GoogleShoppingFeedCategory = request.GoogleShoppingFeedCategory.Trim();
            }

            if (!string.IsNullOrWhiteSpace(elementTypeAlias))
            {
                productRoot.ElementTypeAlias = elementTypeAlias;
            }

            if (request.ElementProperties is { Count: > 0 })
            {
                productRoot.ElementPropertyData = SerializeElementProperties(request.ElementProperties);
            }

            if (!TryApplyDigitalProductSettings(
                    productRoot,
                    request.DigitalDeliveryMethod,
                    request.DigitalFileIds,
                    request.DownloadLinkExpiryDays,
                    request.MaxDownloadsPerLink,
                    applyDefaults: true,
                    result))
            {
                return false;
            }

            // Publish "Before" notification - handlers can modify or cancel
            var creatingNotification = new ProductCreatingNotification(productRoot);
            if (await notificationPublisher.PublishCancelableAsync(creatingNotification, cancellationToken))
            {
                result.AddErrorMessage(creatingNotification.CancelReason ?? "Product creation cancelled");
                return false;
            }

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
            // List order determines PriorityOrder (first = highest priority)
            if (!request.IsDigitalProduct && request.WarehouseIds?.Any() == true)
            {
                var validWarehouseIds = (await db.Warehouses
                    .Where(w => request.WarehouseIds.Contains(w.Id))
                    .Select(w => w.Id)
                    .ToListAsync(cancellationToken))
                    .ToHashSet();

                var priority = 1;
                foreach (var warehouseId in request.WarehouseIds)
                {
                    if (!validWarehouseIds.Contains(warehouseId))
                    {
                        continue;
                    }

                    db.ProductRootWarehouses.Add(new ProductRootWarehouse
                    {
                        ProductRootId = productRoot.Id,
                        WarehouseId = warehouseId,
                        PriorityOrder = priority++
                    });
                }
            }

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
            return true;
        });

        scope.Complete();
        result.ResultObject = productRoot;

        // Publish "After" notification
        if (result.ResultObject != null)
        {
            await notificationPublisher.PublishAsync(
                new ProductCreatedNotification(result.ResultObject),
                cancellationToken);
        }

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

        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            productRoot = await db.RootProducts
                .Include(pr => pr.Collections)
                .Include(pr => pr.ProductRootWarehouses)
                .Include(pr => pr.Products)
                .FirstOrDefaultAsync(pr => pr.Id == productRootId, cancellationToken);

            if (productRoot == null)
            {
                result.AddErrorMessage("Product root not found");
                return false;
            }

            // Publish "Before" notification - handlers can modify or cancel
            var savingNotification = new ProductSavingNotification(productRoot);
            if (await notificationPublisher.PublishCancelableAsync(savingNotification, cancellationToken))
            {
                result.AddErrorMessage(savingNotification.CancelReason ?? "Product update cancelled");
                return false;
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

            if (!TryApplyDigitalProductSettings(
                    productRoot,
                    request.DigitalDeliveryMethod,
                    request.DigitalFileIds,
                    request.DownloadLinkExpiryDays,
                    request.MaxDownloadsPerLink,
                    applyDefaults: false,
                    result))
            {
                return false;
            }

            if (request.Description != null) productRoot.Description = request.Description;
            if (request.MetaDescription != null) productRoot.MetaDescription = request.MetaDescription;
            if (request.PageTitle != null) productRoot.PageTitle = request.PageTitle;
            if (request.NoIndex.HasValue) productRoot.NoIndex = request.NoIndex.Value;
            if (request.OpenGraphImage != null) productRoot.OpenGraphImage = request.OpenGraphImage;
            if (request.CanonicalUrl != null) productRoot.CanonicalUrl = request.CanonicalUrl;

            if (request.ElementTypeAlias != null)
            {
                var alias = request.ElementTypeAlias.Trim();
                if (string.IsNullOrWhiteSpace(alias))
                {
                    productRoot.ElementTypeAlias = null;
                    productRoot.ElementPropertyData = null;
                }
                else
                {
                    var isSameAlias = string.Equals(productRoot.ElementTypeAlias, alias, StringComparison.OrdinalIgnoreCase);
                    if (!isSameAlias)
                    {
                        var elementType = await GetProductElementTypeAsync(alias, cancellationToken);
                        if (elementType == null)
                        {
                            result.AddErrorMessage($"Element Type '{alias}' not found or is not an Element Type");
                            return false;
                        }

                        alias = elementType.Alias;
                        productRoot.ElementPropertyData = null;
                    }

                    productRoot.ElementTypeAlias = alias;
                }
            }

            if (request.ElementProperties != null)
            {
                if (string.IsNullOrWhiteSpace(productRoot.ElementTypeAlias))
                {
                    result.AddErrorMessage("Element properties were provided without an Element Type selection");
                    return false;
                }

                productRoot.ElementPropertyData = SerializeElementProperties(request.ElementProperties);
            }
            if (request.ViewAlias != null) productRoot.ViewAlias = request.ViewAlias;

            // Update tax group
            if (request.TaxGroupId.HasValue && request.TaxGroupId.Value != productRoot.TaxGroupId)
            {
                var newTaxGroup = await db.TaxGroups.FindAsync([request.TaxGroupId.Value], cancellationToken);
                if (newTaxGroup == null)
                {
                    result.AddErrorMessage("Tax group not found");
                    return false;
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
                    return false;
                }
                productRoot.ProductType = newProductType;
                productRoot.ProductTypeId = request.ProductTypeId.Value;
            }

            // Update collections
            if (request.CollectionIds != null)
            {
                productRoot.Collections.Clear();
                if (request.CollectionIds.Any())
                {
                    var collections = await db.ProductCollections
                        .Where(c => request.CollectionIds.Contains(c.Id))
                        .ToListAsync(cancellationToken);
                    foreach (var collection in collections)
                    {
                        productRoot.Collections.Add(collection);
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

                // Add new warehouse assignments - list order determines PriorityOrder
                if (request.WarehouseIds.Any())
                {
                    var priority = 1;
                    foreach (var warehouseId in request.WarehouseIds)
                    {
                        db.ProductRootWarehouses.Add(new ProductRootWarehouse
                        {
                            ProductRootId = productRoot.Id,
                            WarehouseId = warehouseId,
                            PriorityOrder = priority++
                        });
                    }
                }
            }

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
            return true;
        });

        scope.Complete();
        result.ResultObject = productRoot;

        // Publish "After" notification
        if (result.ResultObject != null)
        {
            await notificationPublisher.PublishAsync(
                new ProductSavedNotification(result.ResultObject),
                cancellationToken);
        }

        return result;
    }

    /// <summary>
    /// Deletes a product root and all its variants
    /// </summary>
    public async Task<CrudResult<bool>> DeleteProductRoot(Guid productRootId, CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();
        string? productName = null;
        using var scope = efCoreScopeProvider.CreateScope();

        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var productRoot = await db.RootProducts
                .Include(pr => pr.Products)
                .FirstOrDefaultAsync(pr => pr.Id == productRootId, cancellationToken);

            if (productRoot == null)
            {
                result.AddErrorMessage("Product root not found");
                return false;
            }

            // Capture name for notification before deletion
            productName = productRoot.RootName;

            // Publish "Before" notification - handlers can cancel
            var deletingNotification = new ProductDeletingNotification(productRoot);
            if (await notificationPublisher.PublishCancelableAsync(deletingNotification, cancellationToken))
            {
                result.AddErrorMessage(deletingNotification.CancelReason ?? "Product deletion cancelled");
                return false;
            }

            // Remove all products (variants)
            foreach (var product in productRoot.Products.ToList())
            {
                db.Products.Remove(product);
            }

            db.RootProducts.Remove(productRoot);
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
            result.ResultObject = true;
            return true;
        });

        scope.Complete();

        // Publish "After" notification
        if (result.ResultObject)
        {
            await notificationPublisher.PublishAsync(
                new ProductDeletedNotification(productRootId, productName),
                cancellationToken);
        }

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

        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            variant = await db.Products
                .FirstOrDefaultAsync(p => p.ProductRootId == productRootId && p.Id == variantId, cancellationToken);

            if (variant == null)
            {
                result.AddErrorMessage("Variant not found");
                return false;
            }

            // Validate SKU uniqueness if being updated
            if (request.Sku != null && request.Sku != variant.Sku)
            {
                var skuExists = await db.Products.AnyAsync(p => p.Sku == request.Sku && p.Id != variantId, cancellationToken);
                if (skuExists)
                {
                    result.AddErrorMessage($"SKU '{request.Sku}' already exists");
                    return false;
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
            if (request.ShoppingFeedWidth != null) variant.ShoppingFeedWidth = request.ShoppingFeedWidth;
            if (request.ShoppingFeedHeight != null) variant.ShoppingFeedHeight = request.ShoppingFeedHeight;
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
            return true;
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
        var variantStructureChanged = false;
        using var scope = efCoreScopeProvider.CreateScope();

        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var productRoot = await db.RootProducts
                .FirstOrDefaultAsync(pr => pr.Id == productRootId, cancellationToken);

            if (productRoot == null)
            {
                result.AddErrorMessage("Product root not found");
                return false;
            }

            if (productRoot.IsDigitalProduct && options.Any(o => o.IsVariant))
            {
                result.AddErrorMessage("Digital products cannot have variant options. Use add-on options (IsVariant = false) instead.");
                return false;
            }

            // Capture original variant structure BEFORE modifications
            // This is used to determine if variants need to be regenerated
            var originalVariantOptions = productRoot.ProductOptions
                .Where(o => o.IsVariant)
                .Select(o => new { o.Id, ValueIds = o.ProductOptionValues.Select(v => v.Id).ToHashSet() })
                .ToDictionary(o => o.Id, o => o.ValueIds);

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
                option.IsMultiSelect = optionRequest.IsVariant ? false : optionRequest.IsMultiSelect;

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
                    value.WeightKg = valueRequest.WeightKg;
                }

                savedOptions.Add(option);
            }

            // Explicitly mark ProductOptions as modified to ensure EF Core saves the JSON column
            // In-place modifications to complex JSON properties may not always be detected automatically
            db.Entry(productRoot).Property(p => p.ProductOptions).IsModified = true;

            // Check if variant structure changed (determines if regeneration is needed)
            // Regeneration is needed when:
            // - Variant options are added or removed
            // - Values are added or removed from variant options
            // - The isVariant flag changed on any option
            // Regeneration is NOT needed for metadata-only changes (name, mediaKey, hexValue, sortOrder, etc.)
            var newVariantOptions = productRoot.ProductOptions
                .Where(o => o.IsVariant)
                .Select(o => new { o.Id, ValueIds = o.ProductOptionValues.Select(v => v.Id).ToHashSet() })
                .ToDictionary(o => o.Id, o => o.ValueIds);

            // Check if variant option count changed
            if (originalVariantOptions.Count != newVariantOptions.Count)
            {
                variantStructureChanged = true;
            }
            else
            {
                // Check each variant option for structural changes
                foreach (var (optionId, newValueIds) in newVariantOptions)
                {
                    if (!originalVariantOptions.TryGetValue(optionId, out var originalValueIds))
                    {
                        // New variant option (ID didn't exist before, or option became a variant)
                        variantStructureChanged = true;
                        break;
                    }

                    // Check if value IDs changed
                    if (originalValueIds.Count != newValueIds.Count || !originalValueIds.SetEquals(newValueIds))
                    {
                        variantStructureChanged = true;
                        break;
                    }
                }

                // Check if any original variant option was removed or changed to non-variant
                if (!variantStructureChanged)
                {
                    foreach (var originalOptionId in originalVariantOptions.Keys)
                    {
                        if (!newVariantOptions.ContainsKey(originalOptionId))
                        {
                            variantStructureChanged = true;
                            break;
                        }
                    }
                }
            }

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
            return true;
        });

        scope.Complete();
        result.ResultObject = savedOptions;

        // Regenerate variants only if the variant structure changed
        // This prevents data loss from unnecessary regeneration on metadata-only changes
        if (result.Success && variantStructureChanged)
        {
            logger.LogDebug("SaveProductOptions: Variant structure changed for product {ProductRootId}, regenerating variants",
                productRootId);

            var regenerateResult = await RegenerateVariants(productRootId, cancellationToken: cancellationToken);
            if (!regenerateResult.Success)
            {
                result.AddWarningMessage("Options saved but variant regeneration had issues: " +
                    string.Join(", ", regenerateResult.Messages.Select(m => m.Message)));
            }
        }
        else if (result.Success)
        {
            logger.LogDebug("SaveProductOptions: Saved {OptionCount} options for product {ProductRootId}, no variant regeneration needed",
                options.Count, productRootId);
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

        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var productRoot = await db.RootProducts
                .Include(pr => pr.Products)
                    .ThenInclude(p => p.ProductWarehouses)
                .FirstOrDefaultAsync(pr => pr.Id == productRootId, cancellationToken);

            if (productRoot == null)
            {
                result.AddErrorMessage("Product root not found");
                return false;
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

                // Capture warehouse stock settings before deleting old products
                var templateStockSettings = template?.ProductWarehouses?.ToList() ?? [];

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
                    return false;
                }

                await db.SaveChangesAsync(cancellationToken);

                generatedVariants = await db.Products
                    .Where(p => p.ProductRootId == productRootId)
                    .ToListAsync(cancellationToken);

                // Inherit warehouse stock settings from the template variant
                if (templateStockSettings.Count > 0 && generatedVariants.Count > 0)
                {
                    foreach (var variant in generatedVariants)
                    {
                        foreach (var templateStock in templateStockSettings)
                        {
                            db.ProductWarehouses.Add(new ProductWarehouse
                            {
                                ProductId = variant.Id,
                                WarehouseId = templateStock.WarehouseId,
                                Stock = 0,
                                ReorderPoint = templateStock.ReorderPoint,
                                ReorderQuantity = templateStock.ReorderQuantity,
                                TrackStock = templateStock.TrackStock
                            });
                        }
                    }
                }
            }

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
            return true;
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
        // Build variants first so we can calculate aggregate stock status
        var variants = productRoot.Products.OrderByDescending(p => p.Default).ThenBy(p => p.Name)
            .Select(p => MapToProductVariantDto(p, productRoot.ProductRootWarehouses, settings.Value.LowStockThreshold)).ToList();

        var aggregateStockStatus = CalculateProductRootAggregateStockStatus(productRoot.IsDigitalProduct, variants);
        var aggregateStockStatusLabel = productRoot.IsDigitalProduct ? "Digital" : aggregateStockStatus.ToLabel();
        var aggregateStockStatusCssClass = aggregateStockStatus.ToCssClass();

        return new ProductRootDetailDto
        {
            Id = productRoot.Id,
            RootName = productRoot.RootName ?? string.Empty,
            RootImages = productRoot.RootImages.Select(s => Guid.TryParse(s, out var g) ? g : Guid.Empty).Where(g => g != Guid.Empty).ToList(),
            RootUrl = productRoot.RootUrl,
            GoogleShoppingFeedCategory = productRoot.GoogleShoppingFeedCategory,
            IsDigitalProduct = productRoot.IsDigitalProduct,
            DigitalDeliveryMethod = productRoot.IsDigitalProduct ? productRoot.GetDigitalDeliveryMethod().ToString() : null,
            DigitalFileIds = productRoot.IsDigitalProduct ? productRoot.GetDigitalFileIds() : null,
            DownloadLinkExpiryDays = productRoot.IsDigitalProduct ? productRoot.GetDownloadLinkExpiryDays() : null,
            MaxDownloadsPerLink = productRoot.IsDigitalProduct ? productRoot.GetMaxDownloadsPerLink() : null,
            AggregateStockStatus = aggregateStockStatus,
            AggregateStockStatusLabel = aggregateStockStatusLabel,
            AggregateStockStatusCssClass = aggregateStockStatusCssClass,
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
            CollectionIds = productRoot.Collections.Select(c => c.Id).ToList(),
            WarehouseIds = productRoot.ProductRootWarehouses.Select(prw => prw.WarehouseId).ToList(),
            ProductOptions = productRoot.ProductOptions.OrderBy(o => o.SortOrder).Select(MapToProductOptionDto).ToList(),
            Variants = variants,
            AvailableShippingOptions = MapToShippingOptionExclusionDtos(productRoot),
            ElementProperties = DeserializeElementProperties(productRoot.ElementPropertyData),
            ElementTypeAlias = productRoot.ElementTypeAlias,
            ViewAlias = productRoot.ViewAlias
        };
    }

    /// <summary>
    /// Applies digital product settings from request DTOs to product extended data.
    /// </summary>
    private bool TryApplyDigitalProductSettings(
        ProductRoot productRoot,
        string? digitalDeliveryMethod,
        List<string>? digitalFileIds,
        int? downloadLinkExpiryDays,
        int? maxDownloadsPerLink,
        bool applyDefaults,
        CrudResult<ProductRoot> result)
    {
        if (!productRoot.IsDigitalProduct)
        {
            ClearDigitalProductSettings(productRoot);
            return true;
        }

        var hasDeliveryMethod = !string.IsNullOrWhiteSpace(digitalDeliveryMethod);
        if (hasDeliveryMethod || applyDefaults)
        {
            var deliveryMethodValue = hasDeliveryMethod ? digitalDeliveryMethod : DigitalDeliveryMethod.InstantDownload.ToString();
            if (!Enum.TryParse<DigitalDeliveryMethod>(deliveryMethodValue, ignoreCase: true, out var parsedDeliveryMethod))
            {
                result.AddErrorMessage($"Invalid digital delivery method '{digitalDeliveryMethod}'");
                return false;
            }

            productRoot.SetDigitalDeliveryMethod(parsedDeliveryMethod);
        }

        if (digitalFileIds != null)
        {
            var normalizedFileIds = digitalFileIds
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
            productRoot.SetDigitalFileIds(normalizedFileIds);
        }
        else if (applyDefaults)
        {
            productRoot.SetDigitalFileIds([]);
        }

        if (downloadLinkExpiryDays.HasValue)
        {
            if (downloadLinkExpiryDays.Value < 0)
            {
                result.AddErrorMessage("Download link expiry days must be 0 or greater");
                return false;
            }

            productRoot.SetDownloadLinkExpiryDays(downloadLinkExpiryDays.Value);
        }
        else if (applyDefaults)
        {
            productRoot.SetDownloadLinkExpiryDays(settings.Value.DefaultDownloadLinkExpiryDays);
        }

        if (maxDownloadsPerLink.HasValue)
        {
            if (maxDownloadsPerLink.Value < 0)
            {
                result.AddErrorMessage("Max downloads per link must be 0 or greater");
                return false;
            }

            productRoot.SetMaxDownloadsPerLink(maxDownloadsPerLink.Value);
        }
        else if (applyDefaults)
        {
            productRoot.SetMaxDownloadsPerLink(settings.Value.DefaultMaxDownloadsPerLink);
        }

        return true;
    }

    private static void ClearDigitalProductSettings(ProductRoot productRoot)
    {
        productRoot.ExtendedData.Remove(Constants.ExtendedDataKeys.DigitalDeliveryMethod);
        productRoot.ExtendedData.Remove(Constants.ExtendedDataKeys.DigitalFileIds);
        productRoot.ExtendedData.Remove(Constants.ExtendedDataKeys.DownloadLinkExpiryDays);
        productRoot.ExtendedData.Remove(Constants.ExtendedDataKeys.MaxDownloadsPerLink);
    }

    /// <summary>
    /// Maps warehouse shipping options with exclusion status for a product root
    /// </summary>
    private static List<ShippingOptionExclusionDto> MapToShippingOptionExclusionDtos(ProductRoot productRoot)
    {
        // Get all shipping options from assigned warehouses
        var warehouseOptions = productRoot.ProductRootWarehouses
            .SelectMany(prw => prw.Warehouse?.ShippingOptions ?? [])
            .DistinctBy(so => so.Id)
            .ToList();

        // Calculate exclusion counts across ALL variants
        var totalVariants = productRoot.Products.Count;
        var exclusionCounts = productRoot.Products
            .SelectMany(p => p.ExcludedShippingOptions.Select(eso => eso.Id))
            .GroupBy(id => id)
            .ToDictionary(g => g.Key, g => g.Count());

        return warehouseOptions.Select(so =>
        {
            var excludedCount = exclusionCounts.GetValueOrDefault(so.Id, 0);
            return new ShippingOptionExclusionDto
            {
                Id = so.Id,
                Name = so.Name,
                WarehouseName = so.Warehouse?.Name,
                ProviderKey = so.ProviderKey,
                IsExcluded = excludedCount == totalVariants,
                IsPartiallyExcluded = excludedCount > 0 && excludedCount < totalVariants,
                ExcludedVariantCount = excludedCount,
                TotalVariantCount = totalVariants
            };
        }).ToList();
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
            IsMultiSelect = option.IsMultiSelect,
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
            SkuSuffix = value.SkuSuffix,
            WeightKg = value.WeightKg
        };
    }

    /// <summary>
    /// Calculates the stock status based on available stock, track stock setting, and threshold.
    /// This is the single source of truth for stock status calculation.
    /// </summary>
    private static StockStatus CalculateStockStatus(int availableStock, bool trackStock, int lowStockThreshold)
    {
        if (!trackStock)
            return StockStatus.Untracked;
        if (availableStock <= 0)
            return StockStatus.OutOfStock;
        if (availableStock <= lowStockThreshold)
            return StockStatus.LowStock;
        return StockStatus.InStock;
    }

    /// <summary>
    /// Calculates aggregate stock status across all warehouses.
    /// Uses the "worst" status from tracked warehouses, or Untracked if none track stock.
    /// </summary>
    private static StockStatus CalculateAggregateStockStatus(List<VariantWarehouseStockDto> warehouseStock)
    {
        var trackedWarehouses = warehouseStock.Where(ws => ws.TrackStock).ToList();

        if (trackedWarehouses.Count == 0)
            return StockStatus.Untracked;

        // Return the worst status (OutOfStock > LowStock > InStock)
        if (trackedWarehouses.Any(ws => ws.StockStatus == StockStatus.OutOfStock))
            return StockStatus.OutOfStock;
        if (trackedWarehouses.Any(ws => ws.StockStatus == StockStatus.LowStock))
            return StockStatus.LowStock;

        return StockStatus.InStock;
    }

    /// <summary>
    /// Calculates aggregate stock status for a product root across all its variants.
    /// Returns Untracked for digital products, otherwise aggregates from variant statuses.
    /// </summary>
    private static StockStatus CalculateProductRootAggregateStockStatus(bool isDigital, List<ProductVariantDto> variants)
    {
        if (isDigital)
            return StockStatus.Untracked;

        if (variants.Count == 0)
            return StockStatus.OutOfStock;

        // Return the worst status across all variants (OutOfStock > LowStock > InStock)
        if (variants.All(v => v.StockStatus == StockStatus.OutOfStock))
            return StockStatus.OutOfStock;
        if (variants.Any(v => v.StockStatus == StockStatus.LowStock))
            return StockStatus.LowStock;

        return StockStatus.InStock;
    }

    /// <summary>
    /// Maps a Product entity to a ProductVariantDto
    /// </summary>
    private static ProductVariantDto MapToProductVariantDto(Product product, ICollection<ProductRootWarehouse> rootWarehouses, int lowStockThreshold)
    {
        // Build warehouse stock from root warehouses, using actual stock if it exists
        var warehouseStock = rootWarehouses.Select(rw =>
        {
            var existingStock = product.ProductWarehouses?.FirstOrDefault(pw => pw.WarehouseId == rw.WarehouseId);
            var stock = existingStock?.Stock ?? 0;
            var reservedStock = existingStock?.ReservedStock ?? 0;
            var availableStock = Math.Max(0, stock - reservedStock);
            var trackStock = existingStock?.TrackStock ?? false;
            var stockStatus = CalculateStockStatus(availableStock, trackStock, lowStockThreshold);
            return new VariantWarehouseStockDto
            {
                WarehouseId = rw.WarehouseId,
                WarehouseName = rw.Warehouse?.Name,
                Stock = stock,
                ReservedStock = reservedStock,
                AvailableStock = availableStock,
                ReorderPoint = existingStock?.ReorderPoint,
                ReorderQuantity = existingStock?.ReorderQuantity,
                TrackStock = trackStock,
                StockStatus = stockStatus,
                StockStatusLabel = stockStatus.ToLabel(),
                StockStatusCssClass = stockStatus.ToCssClass()
            };
        }).ToList();

        // Calculate CanBeDefault: must be purchaseable and have stock (if tracked)
        var canBeDefault = product.AvailableForPurchase && product.CanPurchase &&
            (warehouseStock.All(ws => !ws.TrackStock) || warehouseStock.Any(ws => ws.TrackStock && ws.AvailableStock > 0));

        var aggregateStockStatus = CalculateAggregateStockStatus(warehouseStock);

        return new ProductVariantDto
        {
            Id = product.Id,
            ProductRootId = product.ProductRootId,
            Default = product.Default,
            CanBeDefault = canBeDefault,
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
            ShoppingFeedWidth = product.ShoppingFeedWidth,
            ShoppingFeedHeight = product.ShoppingFeedHeight,
            RemoveFromFeed = product.RemoveFromFeed,
            TotalStock = warehouseStock.Sum(ws => ws.AvailableStock),
            TotalReservedStock = warehouseStock.Sum(ws => ws.ReservedStock),
            StockStatus = aggregateStockStatus,
            StockStatusLabel = aggregateStockStatus.ToLabel(),
            StockStatusCssClass = aggregateStockStatus.ToCssClass(),
            WarehouseStock = warehouseStock,
            ShippingRestrictionMode = product.ShippingRestrictionMode,
            ExcludedShippingOptionIds = product.ExcludedShippingOptions.Select(eso => eso.Id).ToList()
        };
    }

    /// <summary>
    /// Gets product variants by their IDs for batch loading (used by property editors).
    /// Returns the Product entities with ProductRoot included.
    /// </summary>
    public async Task<List<Product>> GetVariantsByIds(IEnumerable<Guid> variantIds, CancellationToken cancellationToken = default)
    {
        var idList = variantIds.ToList();
        if (idList.Count == 0) return [];

        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.Products
                .Include(p => p.ProductRoot)
                    .ThenInclude(pr => pr!.ProductType)
                .Include(p => p.ProductRoot)
                    .ThenInclude(pr => pr!.Collections)
                .Include(p => p.Filters)
                .Include(p => p.ProductRoot)
                    .ThenInclude(pr => pr!.ProductRootWarehouses.OrderBy(prw => prw.PriorityOrder))
                        .ThenInclude(prw => prw.Warehouse)
                            
                .Include(p => p.ProductRoot)
                    .ThenInclude(pr => pr!.ProductRootWarehouses)
                        .ThenInclude(prw => prw.Warehouse)
                            .ThenInclude(w => w!.ShippingOptions)
                                
                .Include(p => p.ProductWarehouses)
                    .ThenInclude(pw => pw.Warehouse)
                .AsSplitQuery()
                .Where(p => idList.Contains(p.Id))
                .ToListAsync(cancellationToken));
        scope.Complete();
        return result;
    }

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
            return [];

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

    public async Task<Dictionary<Guid, string>> GetProductNamesByIdsAsync(IEnumerable<Guid> productIds, CancellationToken cancellationToken = default)
    {
        var ids = productIds.ToList();
        if (ids.Count == 0)
            return [];

        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var products = await db.Products
                .Include(p => p.ProductRoot)
                .Where(p => ids.Contains(p.Id))
                .Select(p => new { p.Id, p.Sku, RootName = p.ProductRoot!.RootName })
                .ToListAsync(cancellationToken);

            return products.ToDictionary(
                p => p.Id,
                p => p.RootName ?? p.Sku ?? "Unknown Product");
        });
        scope.Complete();
        return result;
    }

    #endregion

    #region Element Type Support

    /// <summary>
    /// Gets an Element Type by alias, validating it is configured as an Element Type.
    /// </summary>
    public Task<IContentType?> GetProductElementTypeAsync(string? elementTypeAlias, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(elementTypeAlias))
            return Task.FromResult<IContentType?>(null);

        var contentType = contentTypeService.Get(elementTypeAlias);

        // Must be an Element Type
        if (contentType is null || !contentType.IsElement)
        {
            logger.LogWarning(
                "Element Type '{Alias}' is not a valid Element Type", elementTypeAlias);
            return Task.FromResult<IContentType?>(null);
        }

        return Task.FromResult<IContentType?>(contentType);
    }

    /// <summary>
    /// Serializes element property values to JSON for storage.
    /// </summary>
    private static string SerializeElementProperties(Dictionary<string, object?> properties)
        => JsonSerializer.Serialize(properties, JsonOptions);

    /// <summary>
    /// Deserializes element property values from JSON storage.
    /// </summary>
    public Dictionary<string, object?> DeserializeElementProperties(string? json)
        => string.IsNullOrEmpty(json)
            ? []
            : JsonSerializer.Deserialize<Dictionary<string, object?>>(json, JsonOptions)
              ?? [];

    /// <summary>
    /// Gets a ProductRoot by its RootUrl for front-end routing.
    /// </summary>
    public async Task<ProductRoot?> GetByRootUrlAsync(string rootUrl, CancellationToken ct = default)
    {
        var normalizedUrl = rootUrl.ToLowerInvariant();
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync<ProductRoot?>(async db =>
        {
            // Load ProductRoot with Products and their ProductWarehouses
            var query = db.RootProducts
                .Include(pr => pr.Products)
                    .ThenInclude(p => p.ProductWarehouses)
                        .ThenInclude(pw => pw.Warehouse)
                // Also include ProductRootWarehouses for fallback location checking
                .Include(pr => pr.ProductRootWarehouses)
                    .ThenInclude(prw => prw.Warehouse)
                .AsNoTracking()
                .AsSplitQuery();

            var productRoot = await query.FirstOrDefaultAsync(pr => pr.RootUrl == normalizedUrl, ct);

            // Load ServiceRegions for warehouses (needed for CanServeRegion checks)
            if (productRoot != null)
            {
                var warehouseIds = productRoot.Products
                    .SelectMany(p => p.ProductWarehouses)
                    .Where(pw => pw.Warehouse != null)
                    .Select(pw => pw.Warehouse!.Id)
                    .Concat(productRoot.ProductRootWarehouses
                        .Where(prw => prw.Warehouse != null)
                        .Select(prw => prw.Warehouse!.Id))
                    .Distinct()
                    .ToList();

                if (warehouseIds.Count > 0)
                {
                    var warehousesWithData = await db.Warehouses
                        
                        .Include(w => w.ShippingOptions)
                            
                        .Where(w => warehouseIds.Contains(w.Id))
                        .AsNoTracking()
                        .ToDictionaryAsync(w => w.Id, ct);

                    // Populate ServiceRegions and ShippingOptions on the loaded warehouses
                    foreach (var product in productRoot.Products)
                    {
                        foreach (var pw in product.ProductWarehouses.Where(pw => pw.Warehouse != null))
                        {
                            if (warehousesWithData.TryGetValue(pw.Warehouse!.Id, out var fullWarehouse))
                            {
                                pw.Warehouse.SetServiceRegions(fullWarehouse.ServiceRegions);
                                pw.Warehouse.ShippingOptions = fullWarehouse.ShippingOptions;
                            }
                        }
                    }
                    foreach (var prw in productRoot.ProductRootWarehouses.Where(prw => prw.Warehouse != null))
                    {
                        if (warehousesWithData.TryGetValue(prw.Warehouse!.Id, out var fullWarehouse))
                        {
                            prw.Warehouse.SetServiceRegions(fullWarehouse.ServiceRegions);
                            prw.Warehouse.ShippingOptions = fullWarehouse.ShippingOptions;
                        }
                    }
                }

                // Populate ProductRoot back-reference for each Product
                // Required for CanShipToLocation() to check root-level warehouse restrictions
                // (EF Core with NoTracking doesn't automatically populate back-references)
                foreach (var product in productRoot.Products)
                {
                    product.ProductRoot = productRoot;
                }
            }

            return productRoot;
        });
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Gets available product views from configured view locations.
    /// Discovers both physical .cshtml files and precompiled views from RCLs.
    /// </summary>
    public IReadOnlyList<ProductViewInfo> GetAvailableViews()
    {
        List<ProductViewInfo> views = [];
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

    /// <inheritdoc />
    public async Task<AddonPricePreviewDto?> PreviewAddonPriceAsync(
        Guid variantId,
        AddonPricePreviewRequestDto request,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();

        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            // Get the variant with its product root and options
            var variant = await db.Products
                .AsNoTracking()
                .Include(p => p.ProductRoot)
                    .ThenInclude(pr => pr!.ProductOptions.Where(po => !po.IsVariant))
                        .ThenInclude(po => po.ProductOptionValues)
                .FirstOrDefaultAsync(p => p.Id == variantId, cancellationToken);

            if (variant == null)
            {
                return null;
            }

            var basePrice = variant.Price;
            var addonsTotal = 0m;

            // Calculate addon total from selected add-on values
            if (request.SelectedAddons.Count > 0)
            {
                var addonOptions = variant.ProductRoot?.ProductOptions
                    .Where(po => !po.IsVariant)
                    .ToList() ?? [];

                foreach (var selectedAddon in request.SelectedAddons)
                {
                    var option = addonOptions.FirstOrDefault(o => o.Id == selectedAddon.OptionId);
                    var value = option?.ProductOptionValues.FirstOrDefault(v => v.Id == selectedAddon.ValueId);
                    if (value != null)
                    {
                        addonsTotal += value.PriceAdjustment;
                    }
                }
            }

            return new AddonPricePreviewDto
            {
                BasePrice = basePrice,
                AddonsTotal = addonsTotal,
                TotalPrice = basePrice + addonsTotal
            };
        });

        scope.Complete();
        return result;
    }

    #endregion
}

// Temporary compatibility: remove once legacy using directive is cleaned.



