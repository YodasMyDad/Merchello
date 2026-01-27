using Merchello.Core.Accounting.Models;
using Merchello.Core.Data;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Notifications.Inventory;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Products.Services.Parameters;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Products.Services;

public class InventoryService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IMerchelloNotificationPublisher notificationPublisher,
    IProductService productService,
    ILogger<InventoryService> logger) : IInventoryService
{
    private const int MaxRetryAttempts = 3;
    public async Task<CrudResult<bool>> ReserveStockAsync(
        Guid productId,
        Guid warehouseId,
        int quantity,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();

        if (quantity <= 0)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = "Quantity must be greater than zero",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        // Publish "Before" notification - handlers can cancel
        var reservingNotification = new StockReservingNotification(productId, warehouseId, quantity);
        if (await notificationPublisher.PublishCancelableAsync(reservingNotification, cancellationToken))
        {
            result.Messages.Add(new ResultMessage
            {
                Message = reservingNotification.CancelReason ?? "Stock reservation was cancelled.",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        // Variable to capture remaining available stock for notification
        int remainingAvailable = 0;

        // Retry loop for concurrency conflicts
        for (var attempt = 1; attempt <= MaxRetryAttempts; attempt++)
        {
            using var scope = efCoreScopeProvider.CreateScope();
            try
            {
                await scope.ExecuteWithContextAsync<bool>(async db =>
                {
                    var productWarehouse = await db.ProductWarehouses
                        .FirstOrDefaultAsync(pw => pw.ProductId == productId && pw.WarehouseId == warehouseId, cancellationToken);

                    if (productWarehouse == null)
                    {
                        result.Messages.Add(new ResultMessage
                        {
                            Message = $"Product {productId} not found in warehouse {warehouseId}",
                            ResultMessageType = ResultMessageType.Error
                        });
                        return false;
                    }

                    // If stock tracking is disabled, reservation succeeds immediately
                    if (!productWarehouse.TrackStock)
                    {
                        logger.LogInformation("Stock reservation skipped for product {ProductId} in warehouse {WarehouseId} (TrackStock=false)",
                            productId, warehouseId);
                        result.ResultObject = true;
                        remainingAvailable = int.MaxValue;
                        return false;
                    }

                    // Check if sufficient stock is available
                    var availableStock = productWarehouse.Stock - productWarehouse.ReservedStock;
                    if (availableStock < quantity)
                    {
                        result.Messages.Add(new ResultMessage
                        {
                            Message = $"Insufficient stock. Available: {availableStock}, Requested: {quantity}",
                            ResultMessageType = ResultMessageType.Error
                        });
                        return false;
                    }

                    // Reserve the stock
                    productWarehouse.ReservedStock += quantity;
                    remainingAvailable = availableStock - quantity;
                    await db.SaveChangesAsync(cancellationToken);

                    logger.LogInformation("Reserved {Quantity} units of product {ProductId} in warehouse {WarehouseId}. " +
                                         "Reserved stock: {ReservedStock}, Available: {Available}",
                        quantity, productId, warehouseId, productWarehouse.ReservedStock, remainingAvailable);

                    result.ResultObject = true;
                    return true;
                });

                scope.Complete();

                // Publish "After" notification on success
                if (result.ResultObject)
                {
                    await notificationPublisher.PublishAsync(
                        new StockReservedNotification(productId, warehouseId, quantity, remainingAvailable),
                        cancellationToken);
                }

                return result;
            }
            catch (DbUpdateConcurrencyException ex)
            {
                logger.LogWarning(ex, "Concurrency conflict during stock reservation for product {ProductId} in warehouse {WarehouseId}, attempt {Attempt}/{MaxAttempts}",
                    productId, warehouseId, attempt, MaxRetryAttempts);

                if (attempt == MaxRetryAttempts)
                {
                    result.Messages.Add(new ResultMessage
                    {
                        Message = "Stock reservation failed due to concurrent updates. Please try again.",
                        ResultMessageType = ResultMessageType.Error
                    });
                    return result;
                }

                // Brief delay before retry to reduce collision likelihood
                await Task.Delay(10 * attempt, cancellationToken);
            }
        }

        return result;
    }

    public async Task<CrudResult<bool>> ReleaseReservationAsync(
        Guid productId,
        Guid warehouseId,
        int quantity,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();

        if (quantity <= 0)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = "Quantity must be greater than zero",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        // Publish "Before" notification - handlers can cancel
        var releasingNotification = new StockReleasingNotification(productId, warehouseId, quantity);
        if (await notificationPublisher.PublishCancelableAsync(releasingNotification, cancellationToken))
        {
            result.Messages.Add(new ResultMessage
            {
                Message = releasingNotification.CancelReason ?? "Stock release was cancelled.",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        // Retry loop for concurrency conflicts
        for (var attempt = 1; attempt <= MaxRetryAttempts; attempt++)
        {
            using var scope = efCoreScopeProvider.CreateScope();
            try
            {
                await scope.ExecuteWithContextAsync<bool>(async db =>
                {
                    var productWarehouse = await db.ProductWarehouses
                        .FirstOrDefaultAsync(pw => pw.ProductId == productId && pw.WarehouseId == warehouseId, cancellationToken);

                    if (productWarehouse == null)
                    {
                        result.Messages.Add(new ResultMessage
                        {
                            Message = $"Product {productId} not found in warehouse {warehouseId}",
                            ResultMessageType = ResultMessageType.Error
                        });
                        return false;
                    }

                    // If stock tracking is disabled, release succeeds immediately
                    if (!productWarehouse.TrackStock)
                    {
                        logger.LogInformation("Stock reservation release skipped for product {ProductId} in warehouse {WarehouseId} (TrackStock=false)",
                            productId, warehouseId);
                        result.ResultObject = true;
                        return false;
                    }

                    // Release the reservation
                    productWarehouse.ReservedStock = Math.Max(0, productWarehouse.ReservedStock - quantity);
                    await db.SaveChangesAsync(cancellationToken);

                    logger.LogInformation("Released {Quantity} units of product {ProductId} in warehouse {WarehouseId}. " +
                                         "Reserved stock: {ReservedStock}",
                        quantity, productId, warehouseId, productWarehouse.ReservedStock);

                    result.ResultObject = true;
                    return true;
                });

                scope.Complete();

                // Publish "After" notification on success
                if (result.ResultObject)
                {
                    await notificationPublisher.PublishAsync(
                        new StockReleasedNotification(productId, warehouseId, quantity),
                        cancellationToken);
                }

                return result;
            }
            catch (DbUpdateConcurrencyException ex)
            {
                logger.LogWarning(ex, "Concurrency conflict during stock release for product {ProductId} in warehouse {WarehouseId}, attempt {Attempt}/{MaxAttempts}",
                    productId, warehouseId, attempt, MaxRetryAttempts);

                if (attempt == MaxRetryAttempts)
                {
                    result.Messages.Add(new ResultMessage
                    {
                        Message = "Stock release failed due to concurrent updates. Please try again.",
                        ResultMessageType = ResultMessageType.Error
                    });
                    return result;
                }

                await Task.Delay(10 * attempt, cancellationToken);
            }
        }

        return result;
    }

    public async Task<CrudResult<bool>> AllocateStockAsync(
        Guid productId,
        Guid warehouseId,
        int quantity,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();

        if (quantity <= 0)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = "Quantity must be greater than zero",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        // Publish "Before" notification - handlers can cancel
        var allocatingNotification = new StockAllocatingNotification(productId, warehouseId, quantity);
        if (await notificationPublisher.PublishCancelableAsync(allocatingNotification, cancellationToken))
        {
            result.Messages.Add(new ResultMessage
            {
                Message = allocatingNotification.CancelReason ?? "Stock allocation was cancelled.",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        // Variables to capture for post-allocation notifications
        int remainingStock = 0;
        int? reorderPoint = null;
        string? productName = null;

        // Retry loop for concurrency conflicts
        for (var attempt = 1; attempt <= MaxRetryAttempts; attempt++)
        {
            using var scope = efCoreScopeProvider.CreateScope();
            try
            {
                await scope.ExecuteWithContextAsync<bool>(async db =>
                {
                    var productWarehouse = await db.ProductWarehouses
                        .Include(pw => pw.Product)
                        .FirstOrDefaultAsync(pw => pw.ProductId == productId && pw.WarehouseId == warehouseId, cancellationToken);

                    if (productWarehouse == null)
                    {
                        result.Messages.Add(new ResultMessage
                        {
                            Message = $"Product {productId} not found in warehouse {warehouseId}",
                            ResultMessageType = ResultMessageType.Error
                        });
                        return false;
                    }

                    // If stock tracking is disabled, allocation succeeds immediately without modifying stock
                    if (!productWarehouse.TrackStock)
                    {
                        logger.LogInformation("Stock allocation skipped for product {ProductId} in warehouse {WarehouseId} (TrackStock=false)",
                            productId, warehouseId);
                        result.ResultObject = true;
                        return false;
                    }

                    // Deduct from both Stock and ReservedStock
                    productWarehouse.Stock = Math.Max(0, productWarehouse.Stock - quantity);
                    productWarehouse.ReservedStock = Math.Max(0, productWarehouse.ReservedStock - quantity);
                    await db.SaveChangesAsync(cancellationToken);

                    // Capture values for notifications
                    remainingStock = productWarehouse.Stock;
                    reorderPoint = productWarehouse.ReorderPoint;
                    productName = productWarehouse.Product?.Name;

                    logger.LogInformation("Allocated {Quantity} units of product {ProductId} from warehouse {WarehouseId}. " +
                                         "Remaining stock: {Stock}, Reserved: {ReservedStock}",
                        quantity, productId, warehouseId, productWarehouse.Stock, productWarehouse.ReservedStock);

                    result.ResultObject = true;
                    return true;
                });

                scope.Complete();

                // Publish "After" notification on success
                if (result.ResultObject)
                {
                    await notificationPublisher.PublishAsync(
                        new StockAllocatedNotification(productId, warehouseId, quantity, remainingStock),
                        cancellationToken);

                    // Publish low stock notification if stock fell below reorder point
                    if (reorderPoint.HasValue && remainingStock <= reorderPoint.Value)
                    {
                        await notificationPublisher.PublishAsync(
                            new LowStockNotification(productId, warehouseId, productName, remainingStock, reorderPoint.Value),
                            cancellationToken);
                    }

                    // Check if this was the default variant and stock is now 0
                    // If so, reassign the default to another available variant
                    if (remainingStock == 0)
                    {
                        var product = await GetProductByIdAsync(productId, cancellationToken);
                        if (product?.Default == true)
                        {
                            await productService.EnsureDefaultVariantIsAvailableAsync(
                                product.ProductRootId, cancellationToken);
                        }
                    }
                }

                return result;
            }
            catch (DbUpdateConcurrencyException ex)
            {
                logger.LogWarning(ex, "Concurrency conflict during stock allocation for product {ProductId} in warehouse {WarehouseId}, attempt {Attempt}/{MaxAttempts}",
                    productId, warehouseId, attempt, MaxRetryAttempts);

                if (attempt == MaxRetryAttempts)
                {
                    result.Messages.Add(new ResultMessage
                    {
                        Message = "Stock allocation failed due to concurrent updates. Please try again.",
                        ResultMessageType = ResultMessageType.Error
                    });
                    return result;
                }

                await Task.Delay(10 * attempt, cancellationToken);
            }
        }

        return result;
    }

    public async Task<int> GetAvailableStockAsync(
        Guid productId,
        Guid warehouseId,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var productWarehouse = await db.ProductWarehouses
                .FirstOrDefaultAsync(pw => pw.ProductId == productId && pw.WarehouseId == warehouseId, cancellationToken);

            if (productWarehouse == null)
                return 0;

            // If stock is not tracked, return unlimited availability
            if (!productWarehouse.TrackStock)
                return int.MaxValue;

            // Return available stock (current stock minus reserved stock)
            return Math.Max(0, productWarehouse.Stock - productWarehouse.ReservedStock);
        });
        scope.Complete();
        return result;
    }

    public async Task<CrudResult<bool>> ValidateStockAvailabilityAsync(
        Order order,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();

        if (order.LineItems == null || !order.LineItems.Any())
        {
            result.ResultObject = true;
            return result;
        }

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            List<string> validationErrors = [];

            foreach (var lineItem in order.LineItems.Where(li => li.ProductId.HasValue))
            {
                var productWarehouse = await db.ProductWarehouses
                    .FirstOrDefaultAsync(pw => pw.ProductId == lineItem.ProductId!.Value &&
                                              pw.WarehouseId == order.WarehouseId,
                        cancellationToken);

                if (productWarehouse == null)
                {
                    validationErrors.Add($"Product {lineItem.Name} not found in warehouse");
                    continue;
                }

                // Skip validation if stock tracking is disabled
                if (!productWarehouse.TrackStock)
                    continue;

                var availableStock = productWarehouse.Stock - productWarehouse.ReservedStock;
                if (availableStock < lineItem.Quantity)
                {
                    validationErrors.Add($"Insufficient stock for {lineItem.Name}. Available: {availableStock}, Required: {lineItem.Quantity}");
                }
            }

            if (validationErrors.Any())
            {
                foreach (var error in validationErrors)
                {
                    result.Messages.Add(new ResultMessage
                    {
                        Message = error,
                        ResultMessageType = ResultMessageType.Error
                    });
                }
                return false;
            }

            result.ResultObject = true;
            return true;
        });

        scope.Complete();
        return result;
    }

    public async Task<bool> IsStockTrackedAsync(
        Guid productId,
        Guid warehouseId,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var productWarehouse = await db.ProductWarehouses
                .FirstOrDefaultAsync(pw => pw.ProductId == productId && pw.WarehouseId == warehouseId, cancellationToken);

            return productWarehouse?.TrackStock ?? true;
        });
        scope.Complete();
        return result;
    }

    public async Task<CrudResult<bool>> ReverseAllocationAsync(
        Guid productId,
        Guid warehouseId,
        int quantity,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();

        if (quantity <= 0)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = "Quantity must be greater than zero",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        // Variables to capture for notification
        int previousStock = 0;
        int newStock = 0;

        // Retry loop for concurrency conflicts
        for (var attempt = 1; attempt <= MaxRetryAttempts; attempt++)
        {
            using var scope = efCoreScopeProvider.CreateScope();
            try
            {
                await scope.ExecuteWithContextAsync<bool>(async db =>
                {
                    var productWarehouse = await db.ProductWarehouses
                        .FirstOrDefaultAsync(pw => pw.ProductId == productId && pw.WarehouseId == warehouseId, cancellationToken);

                    if (productWarehouse == null)
                    {
                        result.Messages.Add(new ResultMessage
                        {
                            Message = $"Product {productId} not found in warehouse {warehouseId}",
                            ResultMessageType = ResultMessageType.Error
                        });
                        return false;
                    }

                    // If stock tracking is disabled, reversal succeeds immediately without modifying stock
                    if (!productWarehouse.TrackStock)
                    {
                        logger.LogInformation("Stock reversal skipped for product {ProductId} in warehouse {WarehouseId} (TrackStock=false)",
                            productId, warehouseId);
                        result.ResultObject = true;
                        return false;
                    }

                    // Capture previous stock for notification
                    previousStock = productWarehouse.Stock;

                    // Add quantity back to stock (ReservedStock was already decremented during allocation)
                    productWarehouse.Stock += quantity;
                    newStock = productWarehouse.Stock;

                    await db.SaveChangesAsync(cancellationToken);

                    logger.LogInformation("Reversed allocation of {Quantity} units of product {ProductId} to warehouse {WarehouseId}. " +
                                         "Previous stock: {PreviousStock}, New stock: {NewStock}",
                        quantity, productId, warehouseId, previousStock, newStock);

                    result.ResultObject = true;
                    return true;
                });

                scope.Complete();

                // Publish adjustment notification on success
                if (result.ResultObject)
                {
                    await notificationPublisher.PublishAsync(
                        new StockAdjustedNotification(productId, warehouseId, previousStock, newStock, "Shipment reversal/return"),
                        cancellationToken);
                }

                return result;
            }
            catch (DbUpdateConcurrencyException ex)
            {
                logger.LogWarning(ex, "Concurrency conflict during stock reversal for product {ProductId} in warehouse {WarehouseId}, attempt {Attempt}/{MaxAttempts}",
                    productId, warehouseId, attempt, MaxRetryAttempts);

                if (attempt == MaxRetryAttempts)
                {
                    result.Messages.Add(new ResultMessage
                    {
                        Message = "Stock reversal failed due to concurrent updates. Please try again.",
                        ResultMessageType = ResultMessageType.Error
                    });
                    return result;
                }

                await Task.Delay(10 * attempt, cancellationToken);
            }
        }

        return result;
    }

    public async Task<ValidateBasketStockResult> ValidateBasketStockAsync(
        IEnumerable<(Guid ProductId, Guid WarehouseId, int Quantity)> items,
        CancellationToken cancellationToken = default)
    {
        var itemList = items.ToList();
        if (itemList.Count == 0)
            return new ValidateBasketStockResult(true, []);

        // Aggregate quantities per product-warehouse combination (handles split quantities)
        var aggregated = itemList
            .GroupBy(i => (i.ProductId, i.WarehouseId))
            .Select(g => (g.Key.ProductId, g.Key.WarehouseId, Quantity: g.Sum(x => x.Quantity)))
            .ToList();

        var productIds = aggregated.Select(i => i.ProductId).Distinct().ToList();
        var warehouseIds = aggregated.Select(i => i.WarehouseId).Distinct().ToList();

        using var scope = efCoreScopeProvider.CreateScope();
        var unavailable = await scope.ExecuteWithContextAsync(async db =>
        {
            var productWarehouses = await db.ProductWarehouses
                .Include(pw => pw.Product)
                .Where(pw => productIds.Contains(pw.ProductId) && warehouseIds.Contains(pw.WarehouseId))
                .ToListAsync(cancellationToken);

            var lookup = productWarehouses.ToDictionary(pw => (pw.ProductId, pw.WarehouseId));

            List<StockValidationItem> issues = [];
            foreach (var (productId, warehouseId, quantity) in aggregated)
            {
                if (!lookup.TryGetValue((productId, warehouseId), out var pw))
                {
                    issues.Add(new StockValidationItem(productId, "Unknown product", quantity, 0, warehouseId));
                    continue;
                }

                // Skip untracked items - they're always available
                if (!pw.TrackStock)
                    continue;

                var available = Math.Max(0, pw.Stock - pw.ReservedStock);
                if (available < quantity)
                {
                    issues.Add(new StockValidationItem(
                        productId,
                        pw.Product?.Name ?? "Unknown",
                        quantity,
                        available,
                        warehouseId));
                }
            }

            return issues;
        });

        scope.Complete();
        var issues = unavailable ?? new List<StockValidationItem>();
        return new ValidateBasketStockResult(issues.Count == 0, issues);
    }

    /// <summary>
    /// Gets a product by its ID to check if it's the default variant.
    /// </summary>
    private async Task<Products.Models.Product?> GetProductByIdAsync(Guid productId, CancellationToken ct)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var product = await scope.ExecuteWithContextAsync(async db =>
            await db.Products.FirstOrDefaultAsync(p => p.Id == productId, ct));
        scope.Complete();
        return product;
    }
}
