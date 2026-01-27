using Merchello.Core.Data;
using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Fulfilment.Notifications;
using Merchello.Core.Fulfilment.Providers.Interfaces;
using Merchello.Core.Fulfilment.Services.Interfaces;
using Merchello.Core.Fulfilment.Services.Parameters;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Fulfilment.Services;

/// <summary>
/// Service for syncing products and inventory with fulfilment providers.
/// </summary>
public class FulfilmentSyncService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IFulfilmentProviderManager providerManager,
    IMerchelloNotificationPublisher notificationPublisher,
    IOptions<FulfilmentSettings> settings,
    ILogger<FulfilmentSyncService> logger) : IFulfilmentSyncService
{
    private readonly FulfilmentSettings _settings = settings.Value;

    /// <inheritdoc />
    public async Task<FulfilmentSyncLog> SyncProductsAsync(Guid providerConfigId, CancellationToken cancellationToken = default)
    {
        var syncLog = new FulfilmentSyncLog
        {
            ProviderConfigurationId = providerConfigId,
            SyncType = FulfilmentSyncType.ProductsOut,
            Status = FulfilmentSyncStatus.Running,
            StartedAt = DateTime.UtcNow
        };

        // Create initial log entry
        using (var scope = efCoreScopeProvider.CreateScope())
        {
            await scope.ExecuteWithContextAsync<bool>(async db =>
            {
                db.FulfilmentSyncLogs.Add(syncLog);
                await db.SaveChangesAsync(cancellationToken);
                return true;
            });
            scope.Complete();
        }

        try
        {
            // Get the provider configuration
            var registeredProvider = await providerManager.GetConfiguredProviderAsync(providerConfigId, cancellationToken);
            if (registeredProvider == null)
            {
                syncLog.Status = FulfilmentSyncStatus.Failed;
                syncLog.ErrorMessage = $"Provider configuration {providerConfigId} not found.";
                syncLog.CompletedAt = DateTime.UtcNow;
                await SaveSyncLogAsync(syncLog, cancellationToken);
                return syncLog;
            }

            if (!registeredProvider.IsEnabled)
            {
                syncLog.Status = FulfilmentSyncStatus.Failed;
                syncLog.ErrorMessage = $"Provider '{registeredProvider.Metadata.Key}' is disabled.";
                syncLog.CompletedAt = DateTime.UtcNow;
                await SaveSyncLogAsync(syncLog, cancellationToken);
                return syncLog;
            }

            if (!registeredProvider.Metadata.SupportsProductSync)
            {
                syncLog.Status = FulfilmentSyncStatus.Failed;
                syncLog.ErrorMessage = $"Provider '{registeredProvider.Metadata.Key}' does not support product sync.";
                syncLog.CompletedAt = DateTime.UtcNow;
                await SaveSyncLogAsync(syncLog, cancellationToken);
                return syncLog;
            }

            // Get all products that should be synced
            var products = await GetProductsForSyncAsync(cancellationToken);
            syncLog.ItemsProcessed = products.Count;

            if (products.Count == 0)
            {
                syncLog.Status = FulfilmentSyncStatus.Completed;
                syncLog.CompletedAt = DateTime.UtcNow;
                await SaveSyncLogAsync(syncLog, cancellationToken);
                return syncLog;
            }

            // Map to fulfilment products
            var fulfilmentProducts = products.Select(MapToFulfilmentProduct).ToList();

            // Sync to provider
            logger.LogInformation("Syncing {Count} products to provider {ProviderKey}",
                fulfilmentProducts.Count, registeredProvider.Metadata.Key);

            var result = await registeredProvider.Provider.SyncProductsAsync(fulfilmentProducts, cancellationToken);

            syncLog.ItemsSucceeded = result.ItemsSucceeded;
            syncLog.ItemsFailed = result.ItemsFailed;
            syncLog.Status = result.Success ? FulfilmentSyncStatus.Completed : FulfilmentSyncStatus.Failed;

            if (result.Errors.Count > 0)
            {
                syncLog.ErrorMessage = string.Join(Environment.NewLine, result.Errors);
            }

            syncLog.CompletedAt = DateTime.UtcNow;
            await SaveSyncLogAsync(syncLog, cancellationToken);

            logger.LogInformation("Product sync completed for provider {ProviderKey}. Processed: {Processed}, Succeeded: {Succeeded}, Failed: {Failed}",
                registeredProvider.Metadata.Key, syncLog.ItemsProcessed, syncLog.ItemsSucceeded, syncLog.ItemsFailed);

            // Publish notification
            var config = registeredProvider.Configuration;
            if (config == null)
            {
                using var scope = efCoreScopeProvider.CreateScope();
                config = await scope.ExecuteWithContextAsync(async db =>
                    await db.FulfilmentProviderConfigurations
                        .FirstOrDefaultAsync(c => c.Id == providerConfigId, cancellationToken));
                scope.Complete();
            }

            if (config != null)
            {
                await notificationPublisher.PublishAsync(
                    new FulfilmentProductSyncedNotification(config, syncLog),
                    cancellationToken);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Exception during product sync for provider configuration {ConfigId}", providerConfigId);

            syncLog.Status = FulfilmentSyncStatus.Failed;
            syncLog.ErrorMessage = ex.Message;
            syncLog.CompletedAt = DateTime.UtcNow;
            await SaveSyncLogAsync(syncLog, cancellationToken);
        }

        return syncLog;
    }

    /// <inheritdoc />
    public async Task<FulfilmentSyncLog> SyncInventoryAsync(Guid providerConfigId, CancellationToken cancellationToken = default)
    {
        var syncLog = new FulfilmentSyncLog
        {
            ProviderConfigurationId = providerConfigId,
            SyncType = FulfilmentSyncType.InventoryIn,
            Status = FulfilmentSyncStatus.Running,
            StartedAt = DateTime.UtcNow
        };

        // Create initial log entry
        using (var scope = efCoreScopeProvider.CreateScope())
        {
            await scope.ExecuteWithContextAsync<bool>(async db =>
            {
                db.FulfilmentSyncLogs.Add(syncLog);
                await db.SaveChangesAsync(cancellationToken);
                return true;
            });
            scope.Complete();
        }

        try
        {
            // Get the provider configuration
            var registeredProvider = await providerManager.GetConfiguredProviderAsync(providerConfigId, cancellationToken);
            if (registeredProvider == null)
            {
                syncLog.Status = FulfilmentSyncStatus.Failed;
                syncLog.ErrorMessage = $"Provider configuration {providerConfigId} not found.";
                syncLog.CompletedAt = DateTime.UtcNow;
                await SaveSyncLogAsync(syncLog, cancellationToken);
                return syncLog;
            }

            if (!registeredProvider.IsEnabled)
            {
                syncLog.Status = FulfilmentSyncStatus.Failed;
                syncLog.ErrorMessage = $"Provider '{registeredProvider.Metadata.Key}' is disabled.";
                syncLog.CompletedAt = DateTime.UtcNow;
                await SaveSyncLogAsync(syncLog, cancellationToken);
                return syncLog;
            }

            if (!registeredProvider.Metadata.SupportsInventorySync)
            {
                syncLog.Status = FulfilmentSyncStatus.Failed;
                syncLog.ErrorMessage = $"Provider '{registeredProvider.Metadata.Key}' does not support inventory sync.";
                syncLog.CompletedAt = DateTime.UtcNow;
                await SaveSyncLogAsync(syncLog, cancellationToken);
                return syncLog;
            }

            // Get inventory levels from provider
            logger.LogInformation("Fetching inventory levels from provider {ProviderKey}", registeredProvider.Metadata.Key);

            var inventoryLevels = await registeredProvider.Provider.GetInventoryLevelsAsync(cancellationToken);
            syncLog.ItemsProcessed = inventoryLevels.Count;

            if (inventoryLevels.Count == 0)
            {
                syncLog.Status = FulfilmentSyncStatus.Completed;
                syncLog.CompletedAt = DateTime.UtcNow;
                await SaveSyncLogAsync(syncLog, cancellationToken);
                return syncLog;
            }

            // Get provider configuration for sync mode
            var config = registeredProvider.Configuration;
            if (config == null)
            {
                using var configScope = efCoreScopeProvider.CreateScope();
                config = await configScope.ExecuteWithContextAsync(async db =>
                    await db.FulfilmentProviderConfigurations
                        .FirstOrDefaultAsync(c => c.Id == providerConfigId, cancellationToken));
                configScope.Complete();
            }

            var syncMode = config?.InventorySyncMode ?? InventorySyncMode.Full;

            // Apply inventory updates
            var succeeded = 0;
            var failed = 0;
            var errors = new List<string>();

            using (var scope = efCoreScopeProvider.CreateScope())
            {
                foreach (var level in inventoryLevels)
                {
                    try
                    {
                        var updated = await ApplyInventoryLevelInternalAsync(scope, level, syncMode, cancellationToken);
                        if (updated)
                        {
                            succeeded++;
                        }
                        else
                        {
                            // SKU not found - not necessarily an error, just skip
                            logger.LogDebug("SKU {Sku} not found in database, skipping inventory update", level.Sku);
                        }
                    }
                    catch (Exception ex)
                    {
                        failed++;
                        var errorMsg = $"Failed to update inventory for SKU {level.Sku}: {ex.Message}";
                        errors.Add(errorMsg);
                        logger.LogWarning(ex, "Failed to update inventory for SKU {Sku}", level.Sku);
                    }
                }

                await scope.ExecuteWithContextAsync<bool>(async db =>
                    { await db.SaveChangesAsync(cancellationToken); return true; });
                scope.Complete();
            }

            syncLog.ItemsSucceeded = succeeded;
            syncLog.ItemsFailed = failed;
            syncLog.Status = failed == 0 ? FulfilmentSyncStatus.Completed : FulfilmentSyncStatus.Failed;

            if (errors.Count > 0)
            {
                syncLog.ErrorMessage = string.Join(Environment.NewLine, errors.Take(10));
                if (errors.Count > 10)
                {
                    syncLog.ErrorMessage += $"{Environment.NewLine}... and {errors.Count - 10} more errors.";
                }
            }

            syncLog.CompletedAt = DateTime.UtcNow;
            await SaveSyncLogAsync(syncLog, cancellationToken);

            logger.LogInformation("Inventory sync completed for provider {ProviderKey}. Processed: {Processed}, Succeeded: {Succeeded}, Failed: {Failed}",
                registeredProvider.Metadata.Key, syncLog.ItemsProcessed, syncLog.ItemsSucceeded, syncLog.ItemsFailed);

            // Publish notification
            if (config != null)
            {
                await notificationPublisher.PublishAsync(
                    new FulfilmentInventoryUpdatedNotification(config, syncLog, inventoryLevels),
                    cancellationToken);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Exception during inventory sync for provider configuration {ConfigId}", providerConfigId);

            syncLog.Status = FulfilmentSyncStatus.Failed;
            syncLog.ErrorMessage = ex.Message;
            syncLog.CompletedAt = DateTime.UtcNow;
            await SaveSyncLogAsync(syncLog, cancellationToken);
        }

        return syncLog;
    }

    /// <inheritdoc />
    public async Task<PaginatedList<FulfilmentSyncLog>> GetSyncHistoryAsync(
        FulfilmentSyncLogQueryParameters parameters,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var query = db.FulfilmentSyncLogs
                .Include(l => l.ProviderConfiguration)
                .AsQueryable();

            // Apply filters
            if (parameters.ProviderConfigurationId.HasValue)
            {
                query = query.Where(l => l.ProviderConfigurationId == parameters.ProviderConfigurationId.Value);
            }

            if (parameters.SyncType.HasValue)
            {
                query = query.Where(l => l.SyncType == parameters.SyncType.Value);
            }

            if (parameters.Status.HasValue)
            {
                query = query.Where(l => l.Status == parameters.Status.Value);
            }

            if (parameters.FromDate.HasValue)
            {
                query = query.Where(l => l.StartedAt >= parameters.FromDate.Value);
            }

            if (parameters.ToDate.HasValue)
            {
                query = query.Where(l => l.StartedAt <= parameters.ToDate.Value);
            }

            // Get total count
            var totalCount = await query.CountAsync(cancellationToken);

            // Apply ordering and pagination
            var items = await query
                .OrderByDescending(l => l.StartedAt)
                .Skip((parameters.Page - 1) * parameters.PageSize)
                .Take(parameters.PageSize)
                .AsNoTracking()
                .ToListAsync(cancellationToken);

            return new PaginatedList<FulfilmentSyncLog>(items, totalCount, parameters.Page, parameters.PageSize);
        });
        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<FulfilmentSyncLog?> GetSyncLogByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.FulfilmentSyncLogs
                .Include(l => l.ProviderConfiguration)
                .AsNoTracking()
                .FirstOrDefaultAsync(l => l.Id == id, cancellationToken));
        scope.Complete();
        return result;
    }

    private async Task SaveSyncLogAsync(FulfilmentSyncLog syncLog, CancellationToken cancellationToken)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
            { await db.SaveChangesAsync(cancellationToken); return true; });
        scope.Complete();
    }

    /// <summary>
    /// Gets all products that should be synced to fulfilment providers.
    /// </summary>
    private async Task<List<Product>> GetProductsForSyncAsync(CancellationToken cancellationToken)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var products = await scope.ExecuteWithContextAsync(async db =>
            await db.Products
                .Include(p => p.ProductRoot)
                .Include(p => p.ProductWarehouses)
                .Where(p => !string.IsNullOrEmpty(p.Sku))
                .Where(p => !p.ProductRoot.IsDigitalProduct)
                .Where(p => p.CanPurchase)
                .AsNoTracking()
                .ToListAsync(cancellationToken));
        scope.Complete();
        return products;
    }

    /// <summary>
    /// Maps a Product to a FulfilmentProduct for syncing.
    /// </summary>
    private static FulfilmentProduct MapToFulfilmentProduct(Product product)
    {
        // Get first package configuration for dimensions if available
        var package = product.PackageConfigurations.FirstOrDefault()
            ?? product.ProductRoot?.DefaultPackageConfigurations?.FirstOrDefault();

        return new FulfilmentProduct
        {
            ProductId = product.Id,
            Sku = product.Sku!,
            Name = product.Name ?? product.ProductRoot?.RootName ?? "",
            Barcode = product.Gtin,
            Weight = package?.Weight,
            Length = package?.LengthCm,
            Width = package?.WidthCm,
            Height = package?.HeightCm,
            Cost = product.CostOfGoods,
            HsCode = product.HsCode,
            ExtendedData = []
        };
    }

    /// <summary>
    /// Applies an inventory level update from the fulfilment provider.
    /// </summary>
    /// <returns>True if the SKU was found and updated, false otherwise.</returns>
    private async Task<bool> ApplyInventoryLevelInternalAsync(
        IEfCoreScope<MerchelloDbContext> scope,
        FulfilmentInventoryLevel level,
        InventorySyncMode syncMode,
        CancellationToken cancellationToken)
    {
        // Validate incoming quantity
        if (level.AvailableQuantity < 0)
        {
            logger.LogWarning("Received negative inventory quantity {Qty} for SKU {Sku}, skipping",
                level.AvailableQuantity, level.Sku);
            return false;
        }

        // Find product by SKU
        var product = await scope.ExecuteWithContextAsync(async db =>
            await db.Products.FirstOrDefaultAsync(p => p.Sku == level.Sku, cancellationToken));

        if (product == null)
        {
            return false;
        }

        // Find the product-warehouse record
        // If WarehouseCode is provided, try to match by warehouse code
        // Otherwise, update the first matching warehouse record
        ProductWarehouse? productWarehouse;

        if (!string.IsNullOrEmpty(level.WarehouseCode))
        {
            productWarehouse = await scope.ExecuteWithContextAsync(async db =>
                await db.ProductWarehouses
                    .Include(pw => pw.Warehouse)
                    .FirstOrDefaultAsync(pw => pw.ProductId == product.Id &&
                        pw.Warehouse.Code == level.WarehouseCode, cancellationToken));
        }
        else
        {
            productWarehouse = await scope.ExecuteWithContextAsync(async db =>
                await db.ProductWarehouses
                    .FirstOrDefaultAsync(pw => pw.ProductId == product.Id, cancellationToken));
        }

        if (productWarehouse == null)
        {
            return false;
        }

        // Skip if stock tracking is disabled for this product-warehouse
        if (!productWarehouse.TrackStock)
        {
            logger.LogDebug("Stock tracking disabled for product {ProductId} at warehouse {WarehouseId}, skipping update",
                product.Id, productWarehouse.WarehouseId);
            return true; // Return true since we processed it, just didn't need to update
        }

        // Apply update based on sync mode
        switch (syncMode)
        {
            case InventorySyncMode.Full:
                // Full mode: Overwrite stock completely, but preserve reserved stock
                productWarehouse.Stock = level.AvailableQuantity;
                logger.LogDebug("Full sync: Set stock for SKU {Sku} to {Stock}",
                    level.Sku, level.AvailableQuantity);
                break;

            case InventorySyncMode.Delta:
                // Delta mode: Calculate adjustment based on current vs provider stock
                // Note: This assumes the provider is reporting absolute values
                // and we need to calculate the delta
                var currentAvailable = productWarehouse.Stock - productWarehouse.ReservedStock;
                var adjustment = level.AvailableQuantity - currentAvailable;

                if (adjustment != 0)
                {
                    productWarehouse.Stock += adjustment;
                    // Ensure stock doesn't go negative
                    if (productWarehouse.Stock < 0)
                    {
                        productWarehouse.Stock = 0;
                    }
                    logger.LogDebug("Delta sync: Adjusted stock for SKU {Sku} by {Adjustment} to {Stock}",
                        level.Sku, adjustment, productWarehouse.Stock);
                }
                break;
        }

        return true;
    }
}
