using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Data;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Accounting.Services;

public class TaxService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    ILogger<TaxService> logger) : ITaxService
{
    /// <summary>
    /// Gets all tax groups
    /// </summary>
    public async Task<List<TaxGroup>> GetTaxGroups(CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.TaxGroups
                .AsNoTracking()
                .OrderBy(tg => tg.Name)
                .ToListAsync(cancellationToken));
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Gets a tax group by ID
    /// </summary>
    public async Task<TaxGroup?> GetTaxGroup(Guid taxGroupId, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.TaxGroups
                .AsNoTracking()
                .FirstOrDefaultAsync(tg => tg.Id == taxGroupId, cancellationToken));
        scope.Complete();
        return result;
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

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            db.TaxGroups.Add(taxGroup);
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
        });
        scope.Complete();

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

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var existing = await db.TaxGroups
                .FirstOrDefaultAsync(tg => tg.Id == taxGroup.Id, cancellationToken);

            if (existing == null)
            {
                result.AddErrorMessage("Tax group not found");
                return;
            }

            // Validate rate
            if (taxGroup.TaxPercentage < 0 || taxGroup.TaxPercentage > 100)
            {
                result.AddErrorMessage("Tax rate must be between 0 and 100");
                return;
            }

            existing.Name = taxGroup.Name;
            existing.TaxPercentage = taxGroup.TaxPercentage;

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            result.ResultObject = existing;
        });
        scope.Complete();

        return result;
    }

    /// <summary>
    /// Updates an existing tax group by ID
    /// </summary>
    public async Task<CrudResult<TaxGroup>> UpdateTaxGroup(
        Guid taxGroupId,
        string name,
        decimal taxPercentage,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<TaxGroup>();

        // Validate rate
        if (taxPercentage < 0 || taxPercentage > 100)
        {
            result.AddErrorMessage("Tax rate must be between 0 and 100");
            return result;
        }

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var existing = await db.TaxGroups
                .FirstOrDefaultAsync(tg => tg.Id == taxGroupId, cancellationToken);

            if (existing == null)
            {
                result.AddErrorMessage("Tax group not found");
                return;
            }

            existing.Name = name;
            existing.TaxPercentage = taxPercentage;

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            result.ResultObject = existing;
        });
        scope.Complete();

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

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var taxGroup = await db.TaxGroups
                .FirstOrDefaultAsync(tg => tg.Id == taxGroupId, cancellationToken);

            if (taxGroup == null)
            {
                result.AddErrorMessage("Tax group not found");
                return;
            }

            // Check if tax group is in use
            var productsUsingTaxGroup = await db.RootProducts
                .AnyAsync(p => p.TaxGroupId == taxGroupId, cancellationToken);

            if (productsUsingTaxGroup)
            {
                result.AddErrorMessage("Cannot delete tax group - it is in use by products");
                return;
            }

            db.TaxGroups.Remove(taxGroup);
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            result.ResultObject = true;
        });
        scope.Complete();

        return result;
    }
}
