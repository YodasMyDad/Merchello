using Merchello.Core.Data;
using Merchello.Core.Locality.Dtos;
using Merchello.Core.Locality.Models;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Notifications.Warehouse;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shipping.Factories;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Warehouses.Dtos;
using Merchello.Core.Warehouses.Models;
using Merchello.Core.Warehouses.Services.Interfaces;
using Merchello.Core.Warehouses.Services.Parameters;
using Merchello.Core.Warehouses.Factories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Warehouses.Services;

public class WarehouseService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    WarehouseFactory warehouseFactory,
    ShippingOptionFactory shippingOptionFactory,
    IProductService productService,
    IMerchelloNotificationPublisher notificationPublisher,
    ILogger<WarehouseService> logger) : IWarehouseService
{
    /// <summary>
    /// Selects the best warehouse for a product based on priority, region serviceability, and stock availability.
    /// If no single warehouse can fulfill the full quantity, attempts multi-warehouse allocation.
    /// </summary>
    public async Task<WarehouseSelectionResult> SelectWarehouseForProduct(
        SelectWarehouseForProductParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var product = parameters.Product;
        var shippingAddress = parameters.ShippingAddress;
        var quantity = parameters.Quantity;

        if (string.IsNullOrWhiteSpace(shippingAddress.CountryCode))
        {
            return new WarehouseSelectionResult
            {
                FailureReason = "Shipping address must have a valid country code"
            };
        }

        // Load product with necessary relationships if not already loaded
        if (product.ProductRoot == null)
        {
            using var scope = efCoreScopeProvider.CreateScope();
            var loadedProduct = await scope.ExecuteWithContextAsync(async db =>
                await db.Products
                    .AsNoTracking()
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
                    .FirstOrDefaultAsync(p => p.Id == product.Id, cancellationToken));
            scope.Complete();

            if (loadedProduct != null)
            {
                product = loadedProduct;
            }
        }

        // Get warehouses ordered by priority
        var eligibleWarehouses = product.ProductRoot?.ProductRootWarehouses
            .OrderBy(prw => prw.PriorityOrder)
            .Select(prw => prw.Warehouse)
            .Where(w => w != null)
            .ToList() ?? [];

        if (eligibleWarehouses.Count == 0)
        {
            logger.LogWarning(
                "No warehouses configured for product {ProductId} ({ProductName})",
                product.Id,
                product.Name);

            return new WarehouseSelectionResult
            {
                FailureReason = "No warehouses configured for this product"
            };
        }

        // Collect eligible warehouses with stock info for potential multi-warehouse allocation
        List<(Warehouse warehouse, int availableStock, bool trackStock)> warehousesWithStock = [];

        // PHASE 1: Try to find a single warehouse that can fulfill the full quantity
        foreach (var warehouse in eligibleWarehouses)
        {
            // Check if warehouse can serve this region
            if (!warehouse!.CanServeRegion(shippingAddress.CountryCode, shippingAddress.CountyState?.RegionCode))
            {
                logger.LogDebug(
                    "Warehouse {WarehouseId} ({WarehouseName}) cannot serve region {Country}/{State}",
                    warehouse.Id,
                    warehouse.Name,
                    shippingAddress.CountryCode,
                    shippingAddress.CountyState?.RegionCode);
                continue;
            }

            // Check stock availability
            var productWarehouse = product.ProductWarehouses?
                .FirstOrDefault(pw => pw.WarehouseId == warehouse.Id);

            if (productWarehouse == null)
            {
                logger.LogDebug(
                    "Product {ProductId} has no stock record at warehouse {WarehouseId} ({WarehouseName})",
                    product.Id,
                    warehouse.Id,
                    warehouse.Name);
                continue;
            }

            // If stock tracking is disabled for this product-warehouse, always pass stock check
            if (!productWarehouse.TrackStock)
            {
                logger.LogDebug(
                    "Selected warehouse {WarehouseId} ({WarehouseName}) for product {ProductId} - Stock tracking disabled",
                    warehouse.Id,
                    warehouse.Name,
                    product.Id);

                return new WarehouseSelectionResult
                {
                    Warehouse = warehouse,
                    AvailableStock = int.MaxValue // Unlimited availability for untracked items
                };
            }

            // For tracked items, check available stock (Stock - ReservedStock)
            var availableStock = productWarehouse.Stock - productWarehouse.ReservedStock;

            // Track this warehouse for potential multi-warehouse allocation
            if (availableStock > 0)
            {
                warehousesWithStock.Add((warehouse, availableStock, productWarehouse.TrackStock));
            }

            // If this warehouse has enough stock for full quantity, select it immediately
            if (availableStock >= quantity)
            {
                logger.LogDebug(
                    "Selected warehouse {WarehouseId} ({WarehouseName}) for product {ProductId} - Available stock: {Available} (Stock: {Stock}, Reserved: {Reserved})",
                    warehouse.Id,
                    warehouse.Name,
                    product.Id,
                    availableStock,
                    productWarehouse.Stock,
                    productWarehouse.ReservedStock);

                return new WarehouseSelectionResult
                {
                    Warehouse = warehouse,
                    AvailableStock = availableStock
                };
            }

            logger.LogDebug(
                "Warehouse {WarehouseId} ({WarehouseName}) has insufficient available stock: {Available} < {Required} (Stock: {Stock}, Reserved: {Reserved})",
                warehouse.Id,
                warehouse.Name,
                availableStock,
                quantity,
                productWarehouse.Stock,
                productWarehouse.ReservedStock);
        }

        // PHASE 2: No single warehouse can fulfill - try multi-warehouse allocation
        if (warehousesWithStock.Any())
        {
            var totalAvailable = warehousesWithStock.Sum(w => w.availableStock);

            if (totalAvailable >= quantity)
            {
                // We can fulfill across multiple warehouses!
                List<WarehouseAllocation> allocations = [];
                var remainingQuantity = quantity;

                foreach (var (warehouse, availableStock, _) in warehousesWithStock)
                {
                    if (remainingQuantity <= 0)
                        break;

                    var allocatedQuantity = Math.Min(remainingQuantity, availableStock);

                    allocations.Add(new WarehouseAllocation
                    {
                        Warehouse = warehouse,
                        AllocatedQuantity = allocatedQuantity,
                        AvailableStock = availableStock
                    });

                    remainingQuantity -= allocatedQuantity;

                    logger.LogInformation(
                        "Allocated {AllocatedQty} units from warehouse {WarehouseId} ({WarehouseName}) for product {ProductId}",
                        allocatedQuantity,
                        warehouse.Id,
                        warehouse.Name,
                        product.Id);
                }

                logger.LogInformation(
                    "Multi-warehouse fulfillment for product {ProductId}: {Quantity} units allocated across {WarehouseCount} warehouses",
                    product.Id,
                    quantity,
                    allocations.Count);

                return new WarehouseSelectionResult
                {
                    WarehouseAllocations = allocations
                };
            }
        }

        // No suitable warehouse found (single or multi)
        return new WarehouseSelectionResult
        {
            FailureReason = $"Insufficient total stock ({quantity} units required, {warehousesWithStock.Sum(w => w.availableStock)} available) to serve {shippingAddress.CountryCode}"
        };
    }

    #region Warehouse CRUD Operations

    /// <summary>
    /// Creates a new warehouse with optional service regions and shipping options
    /// </summary>
    public async Task<CrudResult<Warehouse>> CreateWarehouse(
        CreateWarehouseParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Warehouse>();

        var warehouse = warehouseFactory.Create(parameters.Name, parameters.Address);
        warehouse.Code = parameters.Code;
        warehouse.SupplierId = parameters.SupplierId;
        warehouse.AutomationMethod = parameters.AutomationMethod;
        warehouse.ExtendedData = parameters.ExtendedData ?? [];
        warehouse.FulfilmentProviderConfigurationId = parameters.FulfilmentProviderConfigurationId;

        // Publish creating notification (cancelable)
        var creatingNotification = new WarehouseCreatingNotification(warehouse);
        if (await notificationPublisher.PublishCancelableAsync(creatingNotification, cancellationToken))
        {
            result.AddErrorMessage("Warehouse creation was cancelled by a notification handler");
            return result;
        }

        // Build service regions list
        List<WarehouseServiceRegion> serviceRegions = [];
        if (parameters.ServiceRegions != null)
        {
            foreach (var (countryCode, regionCode, isExcluded) in parameters.ServiceRegions)
            {
                serviceRegions.Add(new WarehouseServiceRegion
                {
                    CountryCode = countryCode,
                    RegionCode = regionCode,
                    IsExcluded = isExcluded
                });
            }
        }
        warehouse.SetServiceRegions(serviceRegions);

        // Build shipping options and costs lists
        List<ShippingOption> shippingOptions = [];
        if (parameters.ShippingOptions != null)
        {
            foreach (var shippingConfig in parameters.ShippingOptions)
            {
                var shippingOption = shippingOptionFactory.Create(
                    shippingConfig.Name,
                    warehouse.Id,
                    shippingConfig.ProviderKey,
                    shippingConfig.ServiceType,
                    shippingConfig.ProviderSettings,
                    shippingConfig.IsEnabled,
                    shippingConfig.Cost,
                    shippingConfig.DaysFrom,
                    shippingConfig.DaysTo,
                    shippingConfig.IsNextDay,
                    shippingConfig.NextDayCutOffTime);
                // Build country-specific cost overrides (JSON-stored on ShippingOption)
                if (shippingConfig.CountrySpecificCosts != null)
                {
                    var costs = shippingConfig.CountrySpecificCosts
                        .Select(sc => new ShippingCost
                        {
                            ShippingOptionId = shippingOption.Id,
                            CountryCode = sc.Key,
                            Cost = sc.Value
                        })
                        .ToList();
                    shippingOption.SetShippingCosts(costs);
                }

                shippingOption.SetExcludedRegions(NormalizeExcludedRegions(shippingConfig.ExcludedRegions));
                shippingOptions.Add(shippingOption);
            }
        }

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            // Explicitly add all entities - don't rely on cascade
            db.Warehouses.Add(warehouse);
            if (shippingOptions.Count > 0)
                db.ShippingOptions.AddRange(shippingOptions);

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
            return true;
        });
        scope.Complete();

        // Publish created notification
        if (result.Success)
        {
            await notificationPublisher.PublishAsync(new WarehouseCreatedNotification(warehouse), cancellationToken);
        }

        result.ResultObject = warehouse;
        return result;
    }

    /// <summary>
    /// Updates an existing warehouse
    /// </summary>
    public async Task<CrudResult<Warehouse>> UpdateWarehouse(
        UpdateWarehouseParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Warehouse>();
        Warehouse? warehouse = null;

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            warehouse = await db.Warehouses
                .FirstOrDefaultAsync(w => w.Id == parameters.WarehouseId, cancellationToken);

            if (warehouse == null)
            {
                result.Messages.Add(new Shared.Models.ResultMessage
                {
                    Message = "Warehouse not found",
                    ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
                });
                return false;
            }

            // Publish saving notification (cancelable)
            var savingNotification = new WarehouseSavingNotification(warehouse);
            if (await notificationPublisher.PublishCancelableAsync(savingNotification, cancellationToken))
            {
                result.AddErrorMessage("Warehouse update was cancelled by a notification handler");
                return false;
            }

            if (parameters.Name != null)
                warehouse.Name = parameters.Name;

            if (parameters.Code != null)
                warehouse.Code = parameters.Code;

            if (parameters.ShouldClearSupplierId)
                warehouse.SupplierId = null;
            else if (parameters.SupplierId.HasValue)
                warehouse.SupplierId = parameters.SupplierId;

            if (parameters.Address != null)
                warehouse.Address = parameters.Address;

            if (parameters.AutomationMethod != null)
                warehouse.AutomationMethod = parameters.AutomationMethod;

            if (parameters.ExtendedData != null)
                warehouse.ExtendedData = parameters.ExtendedData;

            if (parameters.ShouldClearFulfilmentProviderId)
                warehouse.FulfilmentProviderConfigurationId = null;
            else if (parameters.FulfilmentProviderConfigurationId.HasValue)
                warehouse.FulfilmentProviderConfigurationId = parameters.FulfilmentProviderConfigurationId;

            warehouse.DateUpdated = DateTime.UtcNow;

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            result.ResultObject = warehouse;
            return true;
        });
        scope.Complete();

        // Publish saved notification
        if (result.Success && warehouse != null)
        {
            await notificationPublisher.PublishAsync(new WarehouseSavedNotification(warehouse), cancellationToken);
        }

        return result;
    }

    /// <summary>
    /// Deletes a warehouse with validation
    /// </summary>
    public async Task<CrudResult<bool>> DeleteWarehouse(
        Guid warehouseId,
        bool force = false,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();
        string? warehouseName = null;

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var warehouse = await db.Warehouses
                .Include(w => w.ProductRootWarehouses)
                .Include(w => w.ProductWarehouses)
                .AsSplitQuery()
                .FirstOrDefaultAsync(w => w.Id == warehouseId, cancellationToken);

            if (warehouse == null)
            {
                result.Messages.Add(new Shared.Models.ResultMessage
                {
                    Message = "Warehouse not found",
                    ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
                });
                return false;
            }

            // Check for dependencies
            var hasProductRootReferences = warehouse.ProductRootWarehouses.Any();
            var hasStockRecords = warehouse.ProductWarehouses.Any();

            if (!force && (hasProductRootReferences || hasStockRecords))
            {
                if (hasProductRootReferences)
                {
                    result.Messages.Add(new Shared.Models.ResultMessage
                    {
                        Message = $"Warehouse is assigned to {warehouse.ProductRootWarehouses.Count} product(s). Use force=true to delete anyway.",
                        ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
                    });
                }

                if (hasStockRecords)
                {
                    result.Messages.Add(new Shared.Models.ResultMessage
                    {
                        Message = $"Warehouse has {warehouse.ProductWarehouses.Count} stock record(s). Use force=true to delete anyway.",
                        ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
                    });
                }

                return false;
            }

            // Publish deleting notification (cancelable)
            var deletingNotification = new WarehouseDeletingNotification(warehouse);
            if (await notificationPublisher.PublishCancelableAsync(deletingNotification, cancellationToken))
            {
                result.AddErrorMessage("Warehouse deletion was cancelled by a notification handler");
                return false;
            }

            // Capture name for deleted notification (before entity is removed)
            warehouseName = warehouse.Name;

            // Force delete - cleanup dependencies
            if (force)
            {
                if (hasStockRecords)
                {
                    db.ProductWarehouses.RemoveRange(warehouse.ProductWarehouses);
                    logger.LogWarning(
                        "Force deleting warehouse {WarehouseId} - removed {Count} stock records",
                        warehouseId,
                        warehouse.ProductWarehouses.Count);
                }

                if (hasProductRootReferences)
                {
                    db.ProductRootWarehouses.RemoveRange(warehouse.ProductRootWarehouses);
                    logger.LogWarning(
                        "Force deleting warehouse {WarehouseId} - removed {Count} product root references",
                        warehouseId,
                        warehouse.ProductRootWarehouses.Count);
                }
            }

            db.Warehouses.Remove(warehouse);
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            result.ResultObject = true;
            return true;
        });
        scope.Complete();

        // Publish deleted notification
        if (result.Success)
        {
            await notificationPublisher.PublishAsync(new WarehouseDeletedNotification(warehouseId, warehouseName), cancellationToken);
        }

        return result;
    }

    #endregion

    #region ProductRootWarehouse Management

    /// <summary>
    /// Adds a warehouse to a product root with priority
    /// </summary>
    public async Task<CrudResult<bool>> AddWarehouseToProductRoot(
        AddWarehouseToProductRootParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var productRootId = parameters.ProductRootId;
        var warehouseId = parameters.WarehouseId;
        var priorityOrder = parameters.PriorityOrder;

        var result = new CrudResult<bool>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            // Validate product root exists
            var productRootExists = await db.RootProducts
                .AnyAsync(pr => pr.Id == productRootId, cancellationToken);

            if (!productRootExists)
            {
                result.Messages.Add(new Shared.Models.ResultMessage
                {
                    Message = "Product root not found",
                    ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
                });
                return false;
            }

            // Validate warehouse exists
            var warehouseExists = await db.Warehouses
                .AnyAsync(w => w.Id == warehouseId, cancellationToken);

            if (!warehouseExists)
            {
                result.Messages.Add(new Shared.Models.ResultMessage
                {
                    Message = "Warehouse not found",
                    ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
                });
                return false;
            }

            // Check if already exists
            var exists = await db.ProductRootWarehouses
                .AnyAsync(prw => prw.ProductRootId == productRootId && prw.WarehouseId == warehouseId, cancellationToken);

            if (exists)
            {
                result.Messages.Add(new Shared.Models.ResultMessage
                {
                    Message = "Warehouse is already assigned to this product root",
                    ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
                });
                return false;
            }

            var productRootWarehouse = new ProductRootWarehouse
            {
                ProductRootId = productRootId,
                WarehouseId = warehouseId,
                PriorityOrder = priorityOrder
            };

            db.ProductRootWarehouses.Add(productRootWarehouse);
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            result.ResultObject = true;
            return true;
        });
        scope.Complete();

        return result;
    }

    /// <summary>
    /// Removes a warehouse from a product root and cleans up all variant stock records
    /// </summary>
    public async Task<CrudResult<bool>> RemoveWarehouseFromProductRoot(
        Guid productRootId,
        Guid warehouseId,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var productRootWarehouse = await db.ProductRootWarehouses
                .FirstOrDefaultAsync(
                    prw => prw.ProductRootId == productRootId && prw.WarehouseId == warehouseId,
                    cancellationToken);

            if (productRootWarehouse == null)
            {
                result.Messages.Add(new Shared.Models.ResultMessage
                {
                    Message = "Warehouse is not assigned to this product root",
                    ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
                });
                return false;
            }

            // Get all products (variants) for this product root
            var productIds = await db.Products
                .Where(p => p.ProductRootId == productRootId)
                .Select(p => p.Id)
                .ToListAsync(cancellationToken);

            // Delete all ProductWarehouse records for these variants at this warehouse
            var stockRecords = await db.ProductWarehouses
                .Where(pw => productIds.Contains(pw.ProductId) && pw.WarehouseId == warehouseId)
                .ToListAsync(cancellationToken);

            if (stockRecords.Any())
            {
                db.ProductWarehouses.RemoveRange(stockRecords);
                logger.LogInformation(
                    "Removing warehouse {WarehouseId} from product root {ProductRootId} - deleted {Count} stock records",
                    warehouseId,
                    productRootId,
                    stockRecords.Count);
            }

            // Delete the ProductRootWarehouse record
            db.ProductRootWarehouses.Remove(productRootWarehouse);
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            result.ResultObject = true;
            return true;
        });
        scope.Complete();

        return result;
    }

    /// <summary>
    /// Updates the priority order of a warehouse for a product root
    /// </summary>
    public async Task<CrudResult<bool>> UpdateWarehousePriority(
        UpdateWarehousePriorityParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var productRootWarehouse = await db.ProductRootWarehouses
                .FirstOrDefaultAsync(
                    prw => prw.ProductRootId == parameters.ProductRootId && prw.WarehouseId == parameters.WarehouseId,
                    cancellationToken);

            if (productRootWarehouse == null)
            {
                result.Messages.Add(new Shared.Models.ResultMessage
                {
                    Message = "Warehouse is not assigned to this product root",
                    ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
                });
                return false;
            }

            productRootWarehouse.PriorityOrder = parameters.NewPriorityOrder;
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            result.ResultObject = true;
            return true;
        });
        scope.Complete();

        return result;
    }

    #endregion

    #region Warehouse Products Management

    /// <summary>
    /// Adds multiple products to a warehouse in bulk.
    /// </summary>
    public async Task<CrudResult<int>> AddProductsToWarehouseAsync(
        Guid warehouseId,
        List<Guid> productRootIds,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<int>();
        var addedCount = 0;

        if (productRootIds.Count == 0)
        {
            result.ResultObject = 0;
            return result;
        }

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            // Validate warehouse exists
            var warehouseExists = await db.Warehouses
                .AnyAsync(w => w.Id == warehouseId, cancellationToken);

            if (!warehouseExists)
            {
                result.AddErrorMessage("Warehouse not found");
                return false;
            }

            // Get existing associations to avoid duplicates
            var existingProductRootIds = await db.ProductRootWarehouses
                .Where(prw => prw.WarehouseId == warehouseId && productRootIds.Contains(prw.ProductRootId))
                .Select(prw => prw.ProductRootId)
                .ToListAsync(cancellationToken);

            // Get max priority order
            var maxPriority = await db.ProductRootWarehouses
                .Where(prw => prw.WarehouseId == warehouseId)
                .MaxAsync(prw => (int?)prw.PriorityOrder, cancellationToken) ?? 0;

            foreach (var productRootId in productRootIds)
            {
                if (existingProductRootIds.Contains(productRootId))
                    continue;

                db.ProductRootWarehouses.Add(new ProductRootWarehouse
                {
                    ProductRootId = productRootId,
                    WarehouseId = warehouseId,
                    PriorityOrder = ++maxPriority
                });
                addedCount++;
            }

            if (addedCount > 0)
            {
                await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
            }

            return true;
        });
        scope.Complete();

        result.ResultObject = addedCount;
        return result;
    }

    /// <summary>
    /// Removes multiple products from a warehouse in bulk.
    /// Also removes variant-level stock records.
    /// </summary>
    public async Task<CrudResult<int>> RemoveProductsFromWarehouseAsync(
        Guid warehouseId,
        List<Guid> productRootIds,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<int>();

        if (productRootIds.Count == 0)
        {
            result.ResultObject = 0;
            return result;
        }

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            // Get ProductRootWarehouse records to remove
            var toRemove = await db.ProductRootWarehouses
                .Where(prw => prw.WarehouseId == warehouseId && productRootIds.Contains(prw.ProductRootId))
                .ToListAsync(cancellationToken);

            if (toRemove.Count == 0)
            {
                result.ResultObject = 0;
                return true;
            }

            // Get all variant product IDs for these product roots
            var productIds = await db.Products
                .Where(p => productRootIds.Contains(p.ProductRootId))
                .Select(p => p.Id)
                .ToListAsync(cancellationToken);

            // Remove variant-level stock records at this warehouse
            if (productIds.Count > 0)
            {
                var stockRecords = await db.ProductWarehouses
                    .Where(pw => pw.WarehouseId == warehouseId && productIds.Contains(pw.ProductId))
                    .ToListAsync(cancellationToken);

                if (stockRecords.Count > 0)
                {
                    db.ProductWarehouses.RemoveRange(stockRecords);
                    logger.LogInformation(
                        "Removing {ProductCount} products from warehouse {WarehouseId} - deleted {StockCount} stock records",
                        toRemove.Count,
                        warehouseId,
                        stockRecords.Count);
                }
            }

            // Remove ProductRootWarehouse records
            db.ProductRootWarehouses.RemoveRange(toRemove);
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            result.ResultObject = toRemove.Count;
            return true;
        });
        scope.Complete();

        return result;
    }

    #endregion

    #region Stock Management

    /// <summary>
    /// Sets or updates stock for a product at a warehouse.
    /// If stock changes affect availability (goes to 0 or becomes available from 0),
    /// triggers automatic reassignment to ensure the default variant is available.
    /// </summary>
    public async Task<CrudResult<bool>> SetProductStock(
        SetProductStockParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var productId = parameters.ProductId;
        var warehouseId = parameters.WarehouseId;
        var stock = parameters.Stock;
        var reorderPoint = parameters.ReorderPoint;
        var reorderQuantity = parameters.ReorderQuantity;

        var result = new CrudResult<bool>();

        if (stock < 0)
        {
            result.Messages.Add(new Shared.Models.ResultMessage
            {
                Message = "Stock cannot be negative",
                ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
            });
            return result;
        }

        var shouldCheckDefaultReassignment = false;
        Guid? productRootId = null;

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            // Validate product exists and get default status
            var product = await db.Products
                .FirstOrDefaultAsync(p => p.Id == productId, cancellationToken);

            if (product == null)
            {
                result.Messages.Add(new Shared.Models.ResultMessage
                {
                    Message = "Product not found",
                    ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
                });
                return false;
            }

            // Validate warehouse exists
            var warehouseExists = await db.Warehouses
                .AnyAsync(w => w.Id == warehouseId, cancellationToken);

            if (!warehouseExists)
            {
                result.Messages.Add(new Shared.Models.ResultMessage
                {
                    Message = "Warehouse not found",
                    ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
                });
                return false;
            }

            // Get or create ProductWarehouse record
            var productWarehouse = await db.ProductWarehouses
                .FirstOrDefaultAsync(pw => pw.ProductId == productId && pw.WarehouseId == warehouseId, cancellationToken);

            if (productWarehouse == null)
            {
                productWarehouse = new ProductWarehouse
                {
                    ProductId = productId,
                    WarehouseId = warehouseId,
                    Stock = stock,
                    ReorderPoint = reorderPoint,
                    ReorderQuantity = reorderQuantity
                };
                db.ProductWarehouses.Add(productWarehouse);

                // New record with tracking
                if (productWarehouse.TrackStock)
                {
                    // Check if this is setting a default variant to 0 stock
                    if (product.Default && stock == 0)
                    {
                        shouldCheckDefaultReassignment = true;
                        productRootId = product.ProductRootId;
                    }
                    // Check if a non-default variant is becoming available (new record with stock > 0)
                    else if (!product.Default && stock > 0)
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

                productWarehouse.Stock = stock;
                if (reorderPoint.HasValue)
                    productWarehouse.ReorderPoint = reorderPoint;
                if (reorderQuantity.HasValue)
                    productWarehouse.ReorderQuantity = reorderQuantity;

                if (productWarehouse.TrackStock)
                {
                    var newAvailable = stock - productWarehouse.ReservedStock;

                    // Check if default variant becoming unavailable (stock going to 0)
                    if (product.Default && newAvailable <= 0)
                    {
                        shouldCheckDefaultReassignment = true;
                        productRootId = product.ProductRootId;
                    }
                    // Check if non-default variant becoming available (was 0, now > 0)
                    else if (!product.Default && oldAvailable <= 0 && newAvailable > 0)
                    {
                        shouldCheckDefaultReassignment = true;
                        productRootId = product.ProductRootId;
                    }
                }
            }

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            result.ResultObject = true;
            return true;
        });
        scope.Complete();

        // After scope completes, check if we need to reassign default
        if (shouldCheckDefaultReassignment && productRootId.HasValue)
        {
            await productService.EnsureDefaultVariantIsAvailableAsync(productRootId.Value, cancellationToken);
        }

        return result;
    }

    /// <summary>
    /// Adjusts stock level by a positive or negative amount.
    /// If adjustment affects availability (goes to 0 or becomes available from 0),
    /// triggers automatic reassignment to ensure the default variant is available.
    /// </summary>
    public async Task<CrudResult<bool>> AdjustStock(
        StockAdjustmentParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();

        var shouldCheckDefaultReassignment = false;
        Guid? productRootId = null;

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var productWarehouse = await db.ProductWarehouses
                .Include(pw => pw.Product)
                .FirstOrDefaultAsync(
                    pw => pw.ProductId == parameters.ProductId && pw.WarehouseId == parameters.WarehouseId,
                    cancellationToken);

            if (productWarehouse == null)
            {
                result.Messages.Add(new Shared.Models.ResultMessage
                {
                    Message = "Product stock record not found at this warehouse",
                    ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
                });
                return false;
            }

            var oldStock = productWarehouse.Stock;
            var oldAvailable = oldStock - productWarehouse.ReservedStock;
            var newStock = oldStock + parameters.Adjustment;

            if (newStock < 0)
            {
                result.Messages.Add(new Shared.Models.ResultMessage
                {
                    Message = $"Cannot adjust stock: would result in negative stock ({newStock})",
                    ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
                });
                return false;
            }

            productWarehouse.Stock = newStock;

            if (productWarehouse.TrackStock && productWarehouse.Product != null)
            {
                var newAvailable = newStock - productWarehouse.ReservedStock;

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

            logger.LogInformation(
                "Stock adjusted for product {ProductId} at warehouse {WarehouseId}: {OldStock} -> {NewStock} (adjustment: {Adjustment}, reason: {Reason})",
                parameters.ProductId,
                parameters.WarehouseId,
                oldStock,
                newStock,
                parameters.Adjustment,
                parameters.Reason ?? "Not specified");

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            result.ResultObject = true;
            return true;
        });
        scope.Complete();

        // After scope completes, check if we need to reassign default
        if (shouldCheckDefaultReassignment && productRootId.HasValue)
        {
            await productService.EnsureDefaultVariantIsAvailableAsync(productRootId.Value, cancellationToken);
        }

        return result;
    }

    /// <summary>
    /// Transfers stock from one warehouse to another
    /// </summary>
    public async Task<CrudResult<bool>> TransferStock(
        TransferStockParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var productId = parameters.ProductId;
        var fromWarehouseId = parameters.FromWarehouseId;
        var toWarehouseId = parameters.ToWarehouseId;
        var quantity = parameters.Quantity;

        var result = new CrudResult<bool>();

        if (quantity <= 0)
        {
            result.Messages.Add(new Shared.Models.ResultMessage
            {
                Message = "Quantity must be positive",
                ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
            });
            return result;
        }

        if (fromWarehouseId == toWarehouseId)
        {
            result.Messages.Add(new Shared.Models.ResultMessage
            {
                Message = "Cannot transfer to the same warehouse",
                ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
            });
            return result;
        }

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            // Get source warehouse stock
            var fromStock = await db.ProductWarehouses
                .FirstOrDefaultAsync(
                    pw => pw.ProductId == productId && pw.WarehouseId == fromWarehouseId,
                    cancellationToken);

            if (fromStock == null)
            {
                result.Messages.Add(new Shared.Models.ResultMessage
                {
                    Message = "Source warehouse does not have this product",
                    ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
                });
                return false;
            }

            // Check available stock (Stock - ReservedStock) if tracking is enabled
            var availableStock = fromStock.TrackStock
                ? fromStock.Stock - fromStock.ReservedStock
                : fromStock.Stock;

            if (availableStock < quantity)
            {
                result.Messages.Add(new Shared.Models.ResultMessage
                {
                    Message = fromStock.TrackStock
                        ? $"Insufficient available stock in source warehouse: {availableStock} available ({fromStock.Stock} total - {fromStock.ReservedStock} reserved)"
                        : $"Insufficient stock in source warehouse: {fromStock.Stock} < {quantity}",
                    ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
                });
                return false;
            }

            // Get or create destination warehouse stock
            var toStock = await db.ProductWarehouses
                .FirstOrDefaultAsync(
                    pw => pw.ProductId == productId && pw.WarehouseId == toWarehouseId,
                    cancellationToken);

            if (toStock == null)
            {
                // Validate destination warehouse exists
                var warehouseExists = await db.Warehouses
                    .AnyAsync(w => w.Id == toWarehouseId, cancellationToken);

                if (!warehouseExists)
                {
                    result.Messages.Add(new Shared.Models.ResultMessage
                    {
                        Message = "Destination warehouse not found",
                        ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
                    });
                    return false;
                }

                toStock = new ProductWarehouse
                {
                    ProductId = productId,
                    WarehouseId = toWarehouseId,
                    Stock = 0
                };
                db.ProductWarehouses.Add(toStock);
            }

            // Perform transfer
            fromStock.Stock -= quantity;
            toStock.Stock += quantity;

            logger.LogInformation(
                "Transferred {Quantity} units of product {ProductId} from warehouse {FromWarehouse} to {ToWarehouse}",
                quantity,
                productId,
                fromWarehouseId,
                toWarehouseId);

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            result.ResultObject = true;
            return true;
        });
        scope.Complete();

        return result;
    }

    /// <summary>
    /// Gets all warehouses
    /// </summary>
    public async Task<List<Warehouse>> GetWarehouses(CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.Warehouses
                .AsNoTracking()
                .OrderBy(w => w.Name)
                .ToListAsync(cancellationToken));
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Gets all warehouse stock levels for a product
    /// </summary>
    public async Task<List<ProductStockLevel>> GetProductStockLevels(
        Guid productId,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.ProductWarehouses
                .AsNoTracking()
                .Where(pw => pw.ProductId == productId)
                .Include(pw => pw.Warehouse)
                .Select(pw => new ProductStockLevel
                {
                    WarehouseId = pw.WarehouseId,
                    WarehouseName = pw.Warehouse.Name,
                    WarehouseCode = pw.Warehouse.Code,
                    Stock = pw.Stock,
                    ReservedStock = pw.ReservedStock,
                    TrackStock = pw.TrackStock,
                    ReorderPoint = pw.ReorderPoint,
                    ReorderQuantity = pw.ReorderQuantity
                })
                .ToListAsync(cancellationToken));
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Gets all products in a warehouse, optionally filtered to low stock only
    /// </summary>
    public async Task<List<WarehouseInventoryItem>> GetWarehouseInventory(
        Guid warehouseId,
        bool lowStockOnly = false,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await QueryWarehouseInventoryAsync(db, warehouseId, lowStockOnly, cancellationToken));
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Gets all products below their reorder point across all or specific warehouse(s)
    /// </summary>
    public async Task<List<WarehouseInventoryItem>> GetLowStockProducts(
        Guid? warehouseId = null,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await QueryWarehouseInventoryAsync(db, warehouseId, lowStockOnly: true, cancellationToken));
        scope.Complete();
        return result;
    }

    private static async Task<List<WarehouseInventoryItem>> QueryWarehouseInventoryAsync(
        MerchelloDbContext db,
        Guid? warehouseId,
        bool lowStockOnly,
        CancellationToken cancellationToken)
    {
        IQueryable<ProductWarehouse> query = db.ProductWarehouses
            .AsNoTracking();

        if (warehouseId.HasValue)
        {
            query = query.Where(pw => pw.WarehouseId == warehouseId.Value);
        }

        if (lowStockOnly)
        {
            // Check available stock (Stock - ReservedStock) for tracked items, total Stock for untracked
            query = query.Where(pw => pw.ReorderPoint.HasValue &&
                (pw.TrackStock
                    ? (pw.Stock - pw.ReservedStock) <= pw.ReorderPoint.Value
                    : pw.Stock <= pw.ReorderPoint.Value));
        }

        return await query
            .Include(pw => pw.Product)
            .Select(pw => new WarehouseInventoryItem
            {
                ProductId = pw.ProductId,
                ProductName = pw.Product.Name,
                Sku = pw.Product.Sku,
                Stock = pw.Stock,
                ReservedStock = pw.ReservedStock,
                TrackStock = pw.TrackStock,
                ReorderPoint = pw.ReorderPoint,
                ReorderQuantity = pw.ReorderQuantity
            })
            .ToListAsync(cancellationToken);
    }

    #endregion

    #region Warehouse List and Detail DTOs

    /// <summary>
    /// Gets all warehouses as list DTOs with summary data
    /// </summary>
    public async Task<List<WarehouseListDto>> GetWarehouseListAsync(CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.Warehouses
                .AsNoTracking()
                .Include(w => w.Supplier)
                
                .Include(w => w.ShippingOptions)
                .AsSplitQuery()
                .OrderBy(w => w.Name)
                .Select(w => new WarehouseListDto
                {
                    Id = w.Id,
                    Name = w.Name,
                    Code = w.Code,
                    SupplierId = w.SupplierId,
                    SupplierName = w.Supplier != null ? w.Supplier.Name : null,
                    ServiceRegionCount = w.ServiceRegions.Count,
                    ShippingOptionCount = w.ShippingOptions.Count,
                    AddressSummary = BuildAddressSummary(w.Address),
                    DateUpdated = w.DateUpdated
                })
                .ToListAsync(cancellationToken));
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Gets a warehouse by ID as detail DTO with nested service regions
    /// </summary>
    public async Task<WarehouseDetailDto?> GetWarehouseDetailAsync(Guid warehouseId, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var warehouse = await db.Warehouses
                .AsNoTracking()
                .Include(w => w.Supplier)
                
                .Include(w => w.ShippingOptions)
                .AsSplitQuery()
                .FirstOrDefaultAsync(w => w.Id == warehouseId, cancellationToken);

            if (warehouse == null)
                return null;

            return new WarehouseDetailDto
            {
                Id = warehouse.Id,
                Name = warehouse.Name,
                Code = warehouse.Code,
                SupplierId = warehouse.SupplierId,
                SupplierName = warehouse.Supplier?.Name,
                Address = MapAddress(warehouse.Address),
                ServiceRegions = warehouse.ServiceRegions
                    .OrderBy(r => r.CountryCode)
                    .ThenBy(r => r.RegionCode)
                    .Select(r => new ServiceRegionDto
                    {
                        Id = r.Id,
                        CountryCode = r.CountryCode,
                        RegionCode = r.RegionCode,
                        IsExcluded = r.IsExcluded,
                        RegionDisplay = BuildRegionDisplay(r.CountryCode, r.RegionCode)
                    })
                    .ToList(),
                ShippingOptionCount = warehouse.ShippingOptions.Count,
                DateCreated = warehouse.DateCreated,
                DateUpdated = warehouse.DateUpdated
            };
        });
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Gets a warehouse by ID
    /// </summary>
    public async Task<Warehouse?> GetWarehouseByIdAsync(Guid warehouseId, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.Warehouses
                .AsNoTracking()
                .Include(w => w.Supplier)
                
                .AsSplitQuery()
                .FirstOrDefaultAsync(w => w.Id == warehouseId, cancellationToken));
        scope.Complete();
        return result;
    }

    private static string? BuildAddressSummary(Address? address)
    {
        if (address == null)
            return null;

        List<string> parts = [];
        if (!string.IsNullOrWhiteSpace(address.TownCity))
            parts.Add(address.TownCity);
        if (!string.IsNullOrWhiteSpace(address.Country))
            parts.Add(address.Country);
        else if (!string.IsNullOrWhiteSpace(address.CountryCode))
            parts.Add(address.CountryCode);

        return parts.Count > 0 ? string.Join(", ", parts) : null;
    }

    private static List<ShippingOptionExcludedRegion> NormalizeExcludedRegions(
        IReadOnlyCollection<(string CountryCode, string? RegionCode)>? exclusions)
    {
        if (exclusions is not { Count: > 0 })
        {
            return [];
        }

        return exclusions
            .Where(x => !string.IsNullOrWhiteSpace(x.CountryCode))
            .Select(x => new ShippingOptionExcludedRegion
            {
                CountryCode = x.CountryCode.Trim().ToUpperInvariant(),
                RegionCode = string.IsNullOrWhiteSpace(x.RegionCode)
                    ? null
                    : x.RegionCode.Trim().ToUpperInvariant()
            })
            .GroupBy(x => $"{x.CountryCode}:{x.RegionCode ?? string.Empty}", StringComparer.OrdinalIgnoreCase)
            .Select(g => g.First())
            .ToList();
    }

    private static AddressDto MapAddress(Address address)
    {
        return new AddressDto
        {
            Name = address.Name,
            Company = address.Company,
            AddressOne = address.AddressOne,
            AddressTwo = address.AddressTwo,
            TownCity = address.TownCity,
            CountyState = string.IsNullOrWhiteSpace(address.CountyState?.Name)
                ? address.CountyState?.RegionCode
                : address.CountyState?.Name,
            RegionCode = address.CountyState?.RegionCode,
            PostalCode = address.PostalCode,
            Country = address.Country,
            CountryCode = address.CountryCode,
            Email = address.Email,
            Phone = address.Phone
        };
    }

    private static string BuildRegionDisplay(string countryCode, string? regionCode)
    {
        // Returns ISO 3166-2 format (e.g., "US-CA", "GB-ENG")
        if (string.IsNullOrWhiteSpace(regionCode))
            return countryCode;
        return $"{countryCode}-{regionCode}";
    }

    #endregion

    #region Service Region Management

    /// <summary>
    /// Adds a service region to a warehouse
    /// </summary>
    public async Task<CrudResult<WarehouseServiceRegion>> AddServiceRegionAsync(
        Guid warehouseId,
        CreateServiceRegionDto dto,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<WarehouseServiceRegion>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            // Validate warehouse exists
            var warehouse = await db.Warehouses
                .FirstOrDefaultAsync(w => w.Id == warehouseId, cancellationToken);

            if (warehouse == null)
            {
                result.Messages.Add(new Shared.Models.ResultMessage
                {
                    Message = "Warehouse not found",
                    ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
                });
                return false;
            }

            // Check for duplicate
            var normalizedCountry = dto.CountryCode.ToUpperInvariant();
            var normalizedState = dto.RegionCode?.ToUpperInvariant();

            var regions = warehouse.ServiceRegions;
            var exists = regions.Any(r =>
                string.Equals(r.CountryCode, normalizedCountry, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(r.RegionCode, normalizedState, StringComparison.OrdinalIgnoreCase));

            if (exists)
            {
                result.Messages.Add(new Shared.Models.ResultMessage
                {
                    Message = "A service region with this country and state/province already exists",
                    ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
                });
                return false;
            }

            var region = new WarehouseServiceRegion
            {
                CountryCode = normalizedCountry,
                RegionCode = normalizedState,
                IsExcluded = dto.IsExcluded
            };

            regions.Add(region);
            warehouse.SetServiceRegions(regions);
            warehouse.DateUpdated = DateTime.UtcNow;

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            result.ResultObject = region;
            return true;
        });
        scope.Complete();

        return result;
    }

    /// <summary>
    /// Updates a service region
    /// </summary>
    public async Task<CrudResult<WarehouseServiceRegion>> UpdateServiceRegionAsync(
        Guid warehouseId,
        Guid regionId,
        CreateServiceRegionDto dto,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<WarehouseServiceRegion>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var warehouse = await db.Warehouses
                .FirstOrDefaultAsync(w => w.Id == warehouseId, cancellationToken);

            if (warehouse == null)
            {
                result.Messages.Add(new Shared.Models.ResultMessage
                {
                    Message = "Warehouse not found",
                    ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
                });
                return false;
            }

            var regions = warehouse.ServiceRegions;
            var region = regions.FirstOrDefault(r => r.Id == regionId);
            if (region == null)
            {
                result.Messages.Add(new Shared.Models.ResultMessage
                {
                    Message = "Service region not found",
                    ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
                });
                return false;
            }

            var normalizedCountry = dto.CountryCode.ToUpperInvariant();
            var normalizedState = dto.RegionCode?.ToUpperInvariant();

            // Check for duplicate (excluding current region)
            var duplicate = regions.Any(r =>
                r.Id != regionId &&
                string.Equals(r.CountryCode, normalizedCountry, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(r.RegionCode, normalizedState, StringComparison.OrdinalIgnoreCase));

            if (duplicate)
            {
                result.Messages.Add(new Shared.Models.ResultMessage
                {
                    Message = "A service region with this country and state/province already exists",
                    ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
                });
                return false;
            }

            region.CountryCode = normalizedCountry;
            region.RegionCode = normalizedState;
            region.IsExcluded = dto.IsExcluded;

            warehouse.SetServiceRegions(regions);
            warehouse.DateUpdated = DateTime.UtcNow;

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            result.ResultObject = region;
            return true;
        });
        scope.Complete();

        return result;
    }

    /// <summary>
    /// Deletes a service region
    /// </summary>
    public async Task<CrudResult<bool>> DeleteServiceRegionAsync(
        Guid warehouseId,
        Guid regionId,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var warehouse = await db.Warehouses
                .FirstOrDefaultAsync(w => w.Id == warehouseId, cancellationToken);

            if (warehouse == null)
            {
                result.Messages.Add(new Shared.Models.ResultMessage
                {
                    Message = "Warehouse not found",
                    ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
                });
                return false;
            }

            var regions = warehouse.ServiceRegions;
            var removed = regions.RemoveAll(r => r.Id == regionId);
            if (removed == 0)
            {
                result.Messages.Add(new Shared.Models.ResultMessage
                {
                    Message = "Service region not found",
                    ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
                });
                return false;
            }

            warehouse.SetServiceRegions(regions);
            warehouse.DateUpdated = DateTime.UtcNow;

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            result.ResultObject = true;
            return true;
        });
        scope.Complete();

        return result;
    }

    #endregion
}


