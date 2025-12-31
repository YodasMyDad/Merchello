using Merchello.Core.Data;
using Merchello.Core.Notifications;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Notifications.SupplierNotifications;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Suppliers.Factories;
using Merchello.Core.Suppliers.Models;
using Merchello.Core.Suppliers.Services.Interfaces;
using Merchello.Core.Suppliers.Services.Parameters;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Suppliers.Services;

public class SupplierService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    SupplierFactory supplierFactory,
    IMerchelloNotificationPublisher notificationPublisher,
    ILogger<SupplierService> logger) : ISupplierService
{
    /// <summary>
    /// Gets all suppliers
    /// </summary>
    public async Task<List<Supplier>> GetSuppliersAsync(CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.Suppliers
                .AsNoTracking()
                .Include(s => s.Warehouses)
                .OrderBy(s => s.Name)
                .ToListAsync(cancellationToken));
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Gets a supplier by ID
    /// </summary>
    public async Task<Supplier?> GetSupplierByIdAsync(Guid supplierId, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.Suppliers
                .AsNoTracking()
                .Include(s => s.Warehouses)
                .FirstOrDefaultAsync(s => s.Id == supplierId, cancellationToken));
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Creates a new supplier
    /// </summary>
    public async Task<CrudResult<Supplier>> CreateSupplierAsync(
        CreateSupplierParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Supplier>();

        var supplier = supplierFactory.Create(parameters.Name, parameters.Address);
        supplier.Code = parameters.Code;
        supplier.ContactName = parameters.ContactName;
        supplier.ContactEmail = parameters.ContactEmail;
        supplier.ContactPhone = parameters.ContactPhone;
        supplier.ExtendedData = parameters.ExtendedData ?? [];

        // Publish "Before" notification - handlers can modify or cancel
        var creatingNotification = new SupplierCreatingNotification(supplier);
        if (await notificationPublisher.PublishCancelableAsync(creatingNotification, cancellationToken))
        {
            result.Messages.Add(new ResultMessage
            {
                Message = creatingNotification.CancelReason ?? "Supplier creation cancelled",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            db.Suppliers.Add(supplier);
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
        });
        scope.Complete();

        // Publish "After" notification
        await notificationPublisher.PublishAsync(new SupplierCreatedNotification(supplier), cancellationToken);

        result.ResultObject = supplier;

        logger.LogInformation("Created supplier {SupplierId} ({SupplierName})", supplier.Id, supplier.Name);

        return result;
    }

    /// <summary>
    /// Updates an existing supplier
    /// </summary>
    public async Task<CrudResult<Supplier>> UpdateSupplierAsync(
        UpdateSupplierParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Supplier>();

        // First fetch the supplier
        Supplier? supplier;
        using (var readScope = efCoreScopeProvider.CreateScope())
        {
            supplier = await readScope.ExecuteWithContextAsync(async db =>
                await db.Suppliers.FirstOrDefaultAsync(s => s.Id == parameters.SupplierId, cancellationToken));
            readScope.Complete();
        }

        if (supplier == null)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = "Supplier not found",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        // Publish "Before" notification - handlers can modify or cancel
        var savingNotification = new SupplierSavingNotification(supplier);
        if (await notificationPublisher.PublishCancelableAsync(savingNotification, cancellationToken))
        {
            result.Messages.Add(new ResultMessage
            {
                Message = savingNotification.CancelReason ?? "Supplier update cancelled",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var toUpdate = await db.Suppliers.FirstOrDefaultAsync(s => s.Id == parameters.SupplierId, cancellationToken);
            if (toUpdate == null) return;

            if (parameters.Name != null)
                toUpdate.Name = parameters.Name;

            if (parameters.Code != null)
                toUpdate.Code = parameters.Code;

            if (parameters.Address != null)
                toUpdate.Address = parameters.Address;

            if (parameters.ContactName != null)
                toUpdate.ContactName = parameters.ContactName;

            if (parameters.ContactEmail != null)
                toUpdate.ContactEmail = parameters.ContactEmail;

            if (parameters.ContactPhone != null)
                toUpdate.ContactPhone = parameters.ContactPhone;

            if (parameters.ExtendedData != null)
                toUpdate.ExtendedData = parameters.ExtendedData;

            toUpdate.DateUpdated = DateTime.UtcNow;

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            result.ResultObject = toUpdate;
        });
        scope.Complete();

        // Publish "After" notification
        if (result.ResultObject != null)
        {
            await notificationPublisher.PublishAsync(new SupplierSavedNotification(result.ResultObject), cancellationToken);
        }

        return result;
    }

    /// <summary>
    /// Deletes a supplier
    /// </summary>
    public async Task<CrudResult<bool>> DeleteSupplierAsync(
        Guid supplierId,
        bool force = false,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();

        // First fetch the supplier to validate and publish notification
        Supplier? supplierToDelete;
        int warehouseCount;
        using (var readScope = efCoreScopeProvider.CreateScope())
        {
            supplierToDelete = await readScope.ExecuteWithContextAsync(async db =>
                await db.Suppliers
                    .Include(s => s.Warehouses)
                    .FirstOrDefaultAsync(s => s.Id == supplierId, cancellationToken));
            readScope.Complete();
        }

        if (supplierToDelete == null)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = "Supplier not found",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        warehouseCount = supplierToDelete.Warehouses.Count;

        // Check for warehouse dependencies
        if (warehouseCount > 0 && !force)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = $"Supplier has {warehouseCount} warehouse(s). Use force=true to delete anyway (warehouses will be unlinked, not deleted).",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        // Publish "Before" notification - handlers can cancel
        var deletingNotification = new SupplierDeletingNotification(supplierToDelete);
        if (await notificationPublisher.PublishCancelableAsync(deletingNotification, cancellationToken))
        {
            result.Messages.Add(new ResultMessage
            {
                Message = deletingNotification.CancelReason ?? "Supplier deletion cancelled",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var supplier = await db.Suppliers
                .Include(s => s.Warehouses)
                .FirstOrDefaultAsync(s => s.Id == supplierId, cancellationToken);

            if (supplier == null) return;

            // Force delete - unlink warehouses (set SupplierId to null)
            if (supplier.Warehouses.Any())
            {
                foreach (var warehouse in supplier.Warehouses)
                {
                    warehouse.SupplierId = null;
                }

                logger.LogWarning(
                    "Force deleting supplier {SupplierId} - unlinked {Count} warehouse(s)",
                    supplierId,
                    supplier.Warehouses.Count);
            }

            db.Suppliers.Remove(supplier);
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            result.ResultObject = true;

            logger.LogInformation("Deleted supplier {SupplierId} ({SupplierName})", supplierId, supplier.Name);
        });
        scope.Complete();

        // Publish "After" notification
        if (result.ResultObject)
        {
            await notificationPublisher.PublishAsync(new SupplierDeletedNotification(supplierToDelete), cancellationToken);
        }

        return result;
    }
}
