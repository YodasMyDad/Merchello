using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Data;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Products.ExtensionMethods;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Merchello.Core.Accounting.Services;

public class TaxService(
    IMerchDbContext dbContext,
    ILogger<TaxService> logger) : ITaxService
{
    /// <summary>
    /// Gets all tax groups
    /// </summary>
    public async Task<List<TaxGroup>> GetTaxGroups(CancellationToken cancellationToken = default)
    {
        return await dbContext.TaxGroups
            .OrderBy(tg => tg.Name)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets a tax group by ID
    /// </summary>
    public async Task<TaxGroup?> GetTaxGroup(Guid taxGroupId, CancellationToken cancellationToken = default)
    {
        return await dbContext.TaxGroups
            .FirstOrDefaultAsync(tg => tg.Id == taxGroupId, cancellationToken);
    }

    /// <summary>
    /// Creates a new tax group
    /// </summary>
    public async Task<CrudResult<TaxGroup>> CreateTaxGroup(
        string name,
        decimal rate,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<TaxGroup>();

        // Validate rate
        if (rate < 0 || rate > 100)
        {
            result.AddErrorMessage("Tax rate must be between 0 and 100");
            return result;
        }

        var taxGroup = new TaxGroup
        {
            Id = Guid.NewGuid(),
            Name = name,
            TaxPercentage = rate
        };

        dbContext.TaxGroups.Add(taxGroup);
        await dbContext.SaveChangesAsyncLogged(logger, result, cancellationToken);

        result.ResultObject = taxGroup;
        return result;
    }

    /// <summary>
    /// Updates an existing tax group
    /// </summary>
    public async Task<CrudResult<TaxGroup>> UpdateTaxGroup(
        TaxGroup taxGroup,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<TaxGroup>();

        var existing = await dbContext.TaxGroups
            .FirstOrDefaultAsync(tg => tg.Id == taxGroup.Id, cancellationToken);

        if (existing == null)
        {
            result.AddErrorMessage("Tax group not found");
            return result;
        }

        // Validate rate
        if (taxGroup.TaxPercentage < 0 || taxGroup.TaxPercentage > 100)
        {
            result.AddErrorMessage("Tax rate must be between 0 and 100");
            return result;
        }

        existing.Name = taxGroup.Name;
        existing.TaxPercentage = taxGroup.TaxPercentage;

        await dbContext.SaveChangesAsyncLogged(logger, result, cancellationToken);

        result.ResultObject = existing;
        return result;
    }

    /// <summary>
    /// Deletes a tax group
    /// </summary>
    public async Task<CrudResult<bool>> DeleteTaxGroup(
        Guid taxGroupId,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();

        var taxGroup = await dbContext.TaxGroups
            .FirstOrDefaultAsync(tg => tg.Id == taxGroupId, cancellationToken);

        if (taxGroup == null)
        {
            result.AddErrorMessage("Tax group not found");
            return result;
        }

        // Check if tax group is in use
        var productsUsingTaxGroup = await dbContext.RootProducts
            .AnyAsync(p => p.TaxGroupId == taxGroupId, cancellationToken);

        if (productsUsingTaxGroup)
        {
            result.AddErrorMessage("Cannot delete tax group - it is in use by products");
            return result;
        }

        dbContext.TaxGroups.Remove(taxGroup);
        await dbContext.SaveChangesAsyncLogged(logger, result, cancellationToken);

        result.ResultObject = true;
        return result;
    }
}

