using Merchello.Core.Shared.Models;
using Merchello.Core.Suppliers.Models;
using Merchello.Core.Suppliers.Services.Parameters;

namespace Merchello.Core.Suppliers.Services.Interfaces;

public interface ISupplierService
{
    /// <summary>
    /// Gets all suppliers
    /// </summary>
    Task<List<Supplier>> GetSuppliersAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a supplier by ID
    /// </summary>
    Task<Supplier?> GetSupplierByIdAsync(Guid supplierId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a new supplier
    /// </summary>
    Task<CrudResult<Supplier>> CreateSupplierAsync(CreateSupplierParameters parameters, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates an existing supplier
    /// </summary>
    Task<CrudResult<Supplier>> UpdateSupplierAsync(UpdateSupplierParameters parameters, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes a supplier
    /// </summary>
    /// <param name="supplierId">The supplier ID to delete</param>
    /// <param name="force">If true, also removes warehouse associations (sets SupplierId to null)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task<CrudResult<bool>> DeleteSupplierAsync(Guid supplierId, bool force = false, CancellationToken cancellationToken = default);
}
