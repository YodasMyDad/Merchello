using Merchello.Core.Accounting.Models;
using Merchello.Core.Shared.Models;

namespace Merchello.Core.Accounting.Services.Interfaces;

public interface ITaxService
{
    /// <summary>
    /// Gets all tax groups
    /// </summary>
    Task<List<TaxGroup>> GetTaxGroups(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a tax group by ID
    /// </summary>
    Task<TaxGroup?> GetTaxGroup(Guid taxGroupId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a new tax group
    /// </summary>
    Task<CrudResult<TaxGroup>> CreateTaxGroup(string name, decimal rate, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates an existing tax group
    /// </summary>
    Task<CrudResult<TaxGroup>> UpdateTaxGroup(TaxGroup taxGroup, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates an existing tax group by ID
    /// </summary>
    /// <param name="taxGroupId">The ID of the tax group to update</param>
    /// <param name="name">The new name</param>
    /// <param name="taxPercentage">The new tax percentage (0-100)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task<CrudResult<TaxGroup>> UpdateTaxGroup(Guid taxGroupId, string name, decimal taxPercentage, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes a tax group
    /// </summary>
    Task<CrudResult<bool>> DeleteTaxGroup(Guid taxGroupId, CancellationToken cancellationToken = default);
}

