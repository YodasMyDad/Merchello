using Merchello.Core.Data;
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
        supplier.ExtendedData = parameters.ExtendedData ?? new Dictionary<string, object>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            db.Suppliers.Add(supplier);
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
        });
        scope.Complete();

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

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var supplier = await db.Suppliers
                .FirstOrDefaultAsync(s => s.Id == parameters.SupplierId, cancellationToken);

            if (supplier == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Supplier not found",
                    ResultMessageType = ResultMessageType.Error
                });
                return;
            }

            if (parameters.Name != null)
                supplier.Name = parameters.Name;

            if (parameters.Code != null)
                supplier.Code = parameters.Code;

            if (parameters.Address != null)
                supplier.Address = parameters.Address;

            if (parameters.ContactName != null)
                supplier.ContactName = parameters.ContactName;

            if (parameters.ContactEmail != null)
                supplier.ContactEmail = parameters.ContactEmail;

            if (parameters.ContactPhone != null)
                supplier.ContactPhone = parameters.ContactPhone;

            if (parameters.ExtendedData != null)
                supplier.ExtendedData = parameters.ExtendedData;

            supplier.DateUpdated = DateTime.UtcNow;

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            result.ResultObject = supplier;
        });
        scope.Complete();

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

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var supplier = await db.Suppliers
                .Include(s => s.Warehouses)
                .FirstOrDefaultAsync(s => s.Id == supplierId, cancellationToken);

            if (supplier == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Supplier not found",
                    ResultMessageType = ResultMessageType.Error
                });
                return;
            }

            // Check for warehouse dependencies
            if (supplier.Warehouses.Any())
            {
                if (!force)
                {
                    result.Messages.Add(new ResultMessage
                    {
                        Message = $"Supplier has {supplier.Warehouses.Count} warehouse(s). Use force=true to delete anyway (warehouses will be unlinked, not deleted).",
                        ResultMessageType = ResultMessageType.Error
                    });
                    return;
                }

                // Force delete - unlink warehouses (set SupplierId to null)
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

        return result;
    }
}
