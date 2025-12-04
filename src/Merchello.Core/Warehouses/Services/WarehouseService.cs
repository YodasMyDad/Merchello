using Merchello.Core.Data;
using Merchello.Core.Locality.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
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
    ILogger<WarehouseService> logger) : IWarehouseService
{
    /// <summary>
    /// Selects the best warehouse for a product based on priority, region serviceability, and stock availability.
    /// If no single warehouse can fulfill the full quantity, attempts multi-warehouse allocation.
    /// </summary>
    public async Task<WarehouseSelectionResult> SelectWarehouseForProduct(
        Product product,
        Address shippingAddress,
        int quantity = 1,
        CancellationToken cancellationToken = default)
    {
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
                                .ThenInclude(w => w!.ServiceRegions)
                    .Include(p => p.ProductWarehouses)
                        .ThenInclude(pw => pw.Warehouse)
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
                logger.LogInformation(
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
                logger.LogInformation(
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
    /// Creates a new warehouse
    /// </summary>
    public async Task<CrudResult<Warehouse>> CreateWarehouse(
        CreateWarehouseParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Warehouse>();

        var warehouse = warehouseFactory.Create(parameters.Name, parameters.Address);
        warehouse.Code = parameters.Code;
        warehouse.AutomationMethod = parameters.AutomationMethod;
        warehouse.ExtendedData = parameters.ExtendedData ?? new Dictionary<string, object>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            db.Warehouses.Add(warehouse);
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
        });
        scope.Complete();

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

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var warehouse = await db.Warehouses
                .FirstOrDefaultAsync(w => w.Id == parameters.WarehouseId, cancellationToken);

            if (warehouse == null)
            {
                result.Messages.Add(new Shared.Models.ResultMessage
                {
                    Message = "Warehouse not found",
                    ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
                });
                return;
            }

            if (parameters.Name != null)
                warehouse.Name = parameters.Name;

            if (parameters.Code != null)
                warehouse.Code = parameters.Code;

            if (parameters.Address != null)
                warehouse.Address = parameters.Address;

            if (parameters.AutomationMethod != null)
                warehouse.AutomationMethod = parameters.AutomationMethod;

            if (parameters.ExtendedData != null)
                warehouse.ExtendedData = parameters.ExtendedData;

            warehouse.DateUpdated = DateTime.UtcNow;

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            result.ResultObject = warehouse;
        });
        scope.Complete();

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

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var warehouse = await db.Warehouses
                .Include(w => w.ProductRootWarehouses)
                .Include(w => w.ProductWarehouses)
                .FirstOrDefaultAsync(w => w.Id == warehouseId, cancellationToken);

            if (warehouse == null)
            {
                result.Messages.Add(new Shared.Models.ResultMessage
                {
                    Message = "Warehouse not found",
                    ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
                });
                return;
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

                return;
            }

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
        });
        scope.Complete();

        return result;
    }

    #endregion

    #region ProductRootWarehouse Management

    /// <summary>
    /// Adds a warehouse to a product root with priority
    /// </summary>
    public async Task<CrudResult<bool>> AddWarehouseToProductRoot(
        Guid productRootId,
        Guid warehouseId,
        int priorityOrder,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
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
                return;
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
                return;
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
                return;
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
        await scope.ExecuteWithContextAsync<Task>(async db =>
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
                return;
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
        });
        scope.Complete();

        return result;
    }

    /// <summary>
    /// Updates the priority order of a warehouse for a product root
    /// </summary>
    public async Task<CrudResult<bool>> UpdateWarehousePriority(
        Guid productRootId,
        Guid warehouseId,
        int newPriorityOrder,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
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
                return;
            }

            productRootWarehouse.PriorityOrder = newPriorityOrder;
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            result.ResultObject = true;
        });
        scope.Complete();

        return result;
    }

    #endregion

    #region Stock Management

    /// <summary>
    /// Sets or updates stock for a product at a warehouse
    /// </summary>
    public async Task<CrudResult<bool>> SetProductStock(
        Guid productId,
        Guid warehouseId,
        int stock,
        int? reorderPoint = null,
        int? reorderQuantity = null,
        CancellationToken cancellationToken = default)
    {
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

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            // Validate product exists
            var productExists = await db.Products
                .AnyAsync(p => p.Id == productId, cancellationToken);

            if (!productExists)
            {
                result.Messages.Add(new Shared.Models.ResultMessage
                {
                    Message = "Product not found",
                    ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
                });
                return;
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
                return;
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
            }
            else
            {
                productWarehouse.Stock = stock;
                if (reorderPoint.HasValue)
                    productWarehouse.ReorderPoint = reorderPoint;
                if (reorderQuantity.HasValue)
                    productWarehouse.ReorderQuantity = reorderQuantity;
            }

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            result.ResultObject = true;
        });
        scope.Complete();

        return result;
    }

    /// <summary>
    /// Adjusts stock level by a positive or negative amount
    /// </summary>
    public async Task<CrudResult<bool>> AdjustStock(
        StockAdjustmentParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var productWarehouse = await db.ProductWarehouses
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
                return;
            }

            var newStock = productWarehouse.Stock + parameters.Adjustment;

            if (newStock < 0)
            {
                result.Messages.Add(new Shared.Models.ResultMessage
                {
                    Message = $"Cannot adjust stock: would result in negative stock ({newStock})",
                    ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
                });
                return;
            }

            productWarehouse.Stock = newStock;

            logger.LogInformation(
                "Stock adjusted for product {ProductId} at warehouse {WarehouseId}: {OldStock} -> {NewStock} (adjustment: {Adjustment}, reason: {Reason})",
                parameters.ProductId,
                parameters.WarehouseId,
                productWarehouse.Stock - parameters.Adjustment,
                productWarehouse.Stock,
                parameters.Adjustment,
                parameters.Reason ?? "Not specified");

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            result.ResultObject = true;
        });
        scope.Complete();

        return result;
    }

    /// <summary>
    /// Transfers stock from one warehouse to another
    /// </summary>
    public async Task<CrudResult<bool>> TransferStock(
        Guid productId,
        Guid fromWarehouseId,
        Guid toWarehouseId,
        int quantity,
        CancellationToken cancellationToken = default)
    {
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
        await scope.ExecuteWithContextAsync<Task>(async db =>
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
                return;
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
                return;
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
                    return;
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
        {
            IQueryable<ProductWarehouse> query = db.ProductWarehouses
                .AsNoTracking()
                .Where(pw => pw.WarehouseId == warehouseId);

            if (lowStockOnly)
            {
                // For low stock filtering, check available stock (Stock - ReservedStock) for tracked items
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
        });
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
        {
            // Check available stock (Stock - ReservedStock) for tracked items, total Stock for untracked
            IQueryable<ProductWarehouse> query = db.ProductWarehouses
                .AsNoTracking()
                .Where(pw => pw.ReorderPoint.HasValue &&
                    (pw.TrackStock
                        ? (pw.Stock - pw.ReservedStock) <= pw.ReorderPoint.Value
                        : pw.Stock <= pw.ReorderPoint.Value));

            if (warehouseId.HasValue)
            {
                query = query.Where(pw => pw.WarehouseId == warehouseId.Value);
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
        });
        scope.Complete();
        return result;
    }

    #endregion
}
