using Merchello.Core.Accounting.Models;
using Merchello.Core.Data;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Products.Services;

public class InventoryService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    ILogger<InventoryService> logger) : IInventoryService
{
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

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
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
                return;
            }

            // If stock tracking is disabled, reservation succeeds immediately
            if (!productWarehouse.TrackStock)
            {
                logger.LogInformation("Stock reservation skipped for product {ProductId} in warehouse {WarehouseId} (TrackStock=false)",
                    productId, warehouseId);
                result.ResultObject = true;
                return;
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
                return;
            }

            // Reserve the stock
            productWarehouse.ReservedStock += quantity;
            await db.SaveChangesAsync(cancellationToken);

            logger.LogInformation("Reserved {Quantity} units of product {ProductId} in warehouse {WarehouseId}. " +
                                 "Reserved stock: {ReservedStock}, Available: {Available}",
                quantity, productId, warehouseId, productWarehouse.ReservedStock, availableStock - quantity);

            result.ResultObject = true;
        });

        scope.Complete();
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

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
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
                return;
            }

            // If stock tracking is disabled, release succeeds immediately
            if (!productWarehouse.TrackStock)
            {
                logger.LogInformation("Stock reservation release skipped for product {ProductId} in warehouse {WarehouseId} (TrackStock=false)",
                    productId, warehouseId);
                result.ResultObject = true;
                return;
            }

            // Release the reservation
            productWarehouse.ReservedStock = Math.Max(0, productWarehouse.ReservedStock - quantity);
            await db.SaveChangesAsync(cancellationToken);

            logger.LogInformation("Released {Quantity} units of product {ProductId} in warehouse {WarehouseId}. " +
                                 "Reserved stock: {ReservedStock}",
                quantity, productId, warehouseId, productWarehouse.ReservedStock);

            result.ResultObject = true;
        });

        scope.Complete();
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

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
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
                return;
            }

            // If stock tracking is disabled, allocation succeeds immediately without modifying stock
            if (!productWarehouse.TrackStock)
            {
                logger.LogInformation("Stock allocation skipped for product {ProductId} in warehouse {WarehouseId} (TrackStock=false)",
                    productId, warehouseId);
                result.ResultObject = true;
                return;
            }

            // Deduct from both Stock and ReservedStock
            productWarehouse.Stock = Math.Max(0, productWarehouse.Stock - quantity);
            productWarehouse.ReservedStock = Math.Max(0, productWarehouse.ReservedStock - quantity);
            await db.SaveChangesAsync(cancellationToken);

            logger.LogInformation("Allocated {Quantity} units of product {ProductId} from warehouse {WarehouseId}. " +
                                 "Remaining stock: {Stock}, Reserved: {ReservedStock}",
                quantity, productId, warehouseId, productWarehouse.Stock, productWarehouse.ReservedStock);

            result.ResultObject = true;
        });

        scope.Complete();
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
        await scope.ExecuteWithContextAsync<Task>(async db =>
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
                return;
            }

            result.ResultObject = true;
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
}
