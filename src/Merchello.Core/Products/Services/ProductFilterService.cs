using Merchello.Core.Data;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Products.Services.Parameters;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Products.Services;

public class ProductFilterService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    ILogger<ProductFilterService> logger) : IProductFilterService
{
    public async Task<List<ProductFilterGroup>> GetFilterGroups(CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.ProductFilterGroups
                .Include(fg => fg.Filters)
                .OrderBy(fg => fg.SortOrder)
                .AsNoTracking()
                .ToListAsync(cancellationToken));
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Gets filter groups containing only filters that have products in the specified collection.
    /// Empty groups (with no relevant filters) are excluded.
    /// </summary>
    public async Task<List<ProductFilterGroup>> GetFilterGroupsForCollection(Guid collectionId, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            // Get all filter IDs that have products in this collection
            var relevantFilterIds = await db.Products
                .Where(p => p.ProductRoot.Collections.Any(c => c.Id == collectionId))
                .Where(p => p.AvailableForPurchase && p.CanPurchase)
                .SelectMany(p => p.Filters)
                .Select(f => f.Id)
                .Distinct()
                .ToListAsync(cancellationToken);

            if (relevantFilterIds.Count == 0)
                return [];

            // Get filter groups with their filters
            var groups = await db.ProductFilterGroups
                .Include(g => g.Filters)
                .AsNoTracking()
                .ToListAsync(cancellationToken);

            // Filter to only include relevant filters and remove empty groups
            foreach (var group in groups)
            {
                group.Filters = group.Filters
                    .Where(f => relevantFilterIds.Contains(f.Id))
                    .OrderBy(f => f.SortOrder)
                    .ToList();
            }

            return groups
                .Where(g => g.Filters.Any())
                .OrderBy(g => g.SortOrder)
                .ToList();
        });
        scope.Complete();
        return result;
    }

    public async Task<CrudResult<ProductFilterGroup>> CreateFilterGroup(
        string name,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<ProductFilterGroup>();

        var filterGroup = new ProductFilterGroup
        {
            Id = GuidExtensions.NewSequentialGuid,
            Name = name
        };

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            db.ProductFilterGroups.Add(filterGroup);
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
        });
        scope.Complete();

        result.ResultObject = filterGroup;
        return result;
    }

    /// <summary>
    /// Creates a new product filter within a filter group
    /// </summary>
    public async Task<CrudResult<ProductFilter>> CreateFilter(
        CreateFilterParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<ProductFilter>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            // Get the current filter count for sort order
            var filterCount = await db.ProductFilters
                .CountAsync(f => f.ProductFilterGroupId == parameters.FilterGroupId, cancellationToken);

            // Verify filter group exists
            var filterGroupExists = await db.ProductFilterGroups
                .AnyAsync(fg => fg.Id == parameters.FilterGroupId, cancellationToken);

            if (!filterGroupExists)
            {
                result.AddErrorMessage("Filter group with ID " + parameters.FilterGroupId + " not found");
                return;
            }

            var filter = new ProductFilter
            {
                Id = GuidExtensions.NewSequentialGuid,
                Name = parameters.Name,
                HexColour = parameters.HexColour,
                Image = parameters.Image,
                SortOrder = filterCount,
                ProductFilterGroupId = parameters.FilterGroupId
            };

            db.ProductFilters.Add(filter);
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);

            result.ResultObject = filter;
        });
        scope.Complete();

        return result;
    }

    /// <summary>
    /// Gets a single filter group by ID
    /// </summary>
    public async Task<ProductFilterGroup?> GetFilterGroup(Guid filterGroupId, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.ProductFilterGroups
                .Include(fg => fg.Filters)
                .FirstOrDefaultAsync(fg => fg.Id == filterGroupId, cancellationToken));
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Updates a filter group
    /// </summary>
    public async Task<CrudResult<ProductFilterGroup>> UpdateFilterGroup(
        Guid filterGroupId,
        string? name,
        int? sortOrder,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<ProductFilterGroup>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var filterGroup = await db.ProductFilterGroups
                .Include(fg => fg.Filters)
                .FirstOrDefaultAsync(fg => fg.Id == filterGroupId, cancellationToken);

            if (filterGroup == null)
            {
                result.AddErrorMessage($"Filter group with ID {filterGroupId} not found");
                return;
            }

            if (name != null) filterGroup.Name = name;
            if (sortOrder.HasValue) filterGroup.SortOrder = sortOrder.Value;

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
            result.ResultObject = filterGroup;
        });
        scope.Complete();

        return result;
    }

    /// <summary>
    /// Deletes a filter group and all its filters
    /// </summary>
    public async Task<CrudResult<bool>> DeleteFilterGroup(Guid filterGroupId, CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var filterGroup = await db.ProductFilterGroups
                .Include(fg => fg.Filters)
                .FirstOrDefaultAsync(fg => fg.Id == filterGroupId, cancellationToken);

            if (filterGroup == null)
            {
                result.AddErrorMessage($"Filter group with ID {filterGroupId} not found");
                return;
            }

            // Remove all filters in the group first
            db.ProductFilters.RemoveRange(filterGroup.Filters);
            db.ProductFilterGroups.Remove(filterGroup);

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
            result.ResultObject = true;
        });
        scope.Complete();

        return result;
    }

    /// <summary>
    /// Reorders filter groups by setting their sort order based on the provided ordered list of IDs
    /// </summary>
    public async Task<CrudResult<bool>> ReorderFilterGroups(List<Guid> orderedIds, CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var filterGroups = await db.ProductFilterGroups
                .Where(fg => orderedIds.Contains(fg.Id))
                .ToListAsync(cancellationToken);

            for (var i = 0; i < orderedIds.Count; i++)
            {
                var filterGroup = filterGroups.FirstOrDefault(fg => fg.Id == orderedIds[i]);
                if (filterGroup != null)
                {
                    filterGroup.SortOrder = i;
                }
            }

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
            result.ResultObject = true;
        });
        scope.Complete();

        return result;
    }

    /// <summary>
    /// Gets a single filter by ID
    /// </summary>
    public async Task<ProductFilter?> GetFilter(Guid filterId, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.ProductFilters
                .FirstOrDefaultAsync(f => f.Id == filterId, cancellationToken));
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Updates a filter
    /// </summary>
    public async Task<CrudResult<ProductFilter>> UpdateFilter(
        UpdateFilterParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<ProductFilter>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var filter = await db.ProductFilters
                .FirstOrDefaultAsync(f => f.Id == parameters.FilterId, cancellationToken);

            if (filter == null)
            {
                result.AddErrorMessage("Filter with ID " + parameters.FilterId + " not found");
                return;
            }

            if (parameters.Name != null) filter.Name = parameters.Name;
            if (parameters.HexColour != null) filter.HexColour = parameters.HexColour == "" ? null : parameters.HexColour;
            if (parameters.Image.HasValue) filter.Image = parameters.Image.Value == Guid.Empty ? null : parameters.Image.Value;
            if (parameters.SortOrder.HasValue) filter.SortOrder = parameters.SortOrder.Value;

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
            result.ResultObject = filter;
        });
        scope.Complete();

        return result;
    }

    /// <summary>
    /// Deletes a filter
    /// </summary>
    public async Task<CrudResult<bool>> DeleteFilter(Guid filterId, CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var filter = await db.ProductFilters
                .FirstOrDefaultAsync(f => f.Id == filterId, cancellationToken);

            if (filter == null)
            {
                result.AddErrorMessage($"Filter with ID {filterId} not found");
                return;
            }

            db.ProductFilters.Remove(filter);
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
            result.ResultObject = true;
        });
        scope.Complete();

        return result;
    }

    /// <summary>
    /// Reorders filters within a group by setting their sort order based on the provided ordered list of IDs
    /// </summary>
    public async Task<CrudResult<bool>> ReorderFilters(Guid filterGroupId, List<Guid> orderedIds, CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var filters = await db.ProductFilters
                .Where(f => f.ProductFilterGroupId == filterGroupId && orderedIds.Contains(f.Id))
                .ToListAsync(cancellationToken);

            for (var i = 0; i < orderedIds.Count; i++)
            {
                var filter = filters.FirstOrDefault(f => f.Id == orderedIds[i]);
                if (filter != null)
                {
                    filter.SortOrder = i;
                }
            }

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
            result.ResultObject = true;
        });
        scope.Complete();

        return result;
    }

    /// <summary>
    /// Assigns filters to a product, replacing any existing filter assignments
    /// </summary>
    public async Task<CrudResult<bool>> AssignFiltersToProduct(Guid productId, List<Guid> filterIds, CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var product = await db.Products
                .Include(p => p.Filters)
                .FirstOrDefaultAsync(p => p.Id == productId, cancellationToken);

            if (product == null)
            {
                result.AddErrorMessage($"Product with ID {productId} not found");
                return;
            }

            // Get the filters to assign
            var filtersToAssign = await db.ProductFilters
                .Where(f => filterIds.Contains(f.Id))
                .ToListAsync(cancellationToken);

            // Clear existing and add new assignments
            product.Filters.Clear();
            foreach (var filter in filtersToAssign)
            {
                product.Filters.Add(filter);
            }

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
            result.ResultObject = true;
        });
        scope.Complete();

        return result;
    }

    /// <summary>
    /// Gets all filters assigned to a product
    /// </summary>
    public async Task<List<ProductFilter>> GetFiltersForProduct(Guid productId, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var product = await db.Products
                .Include(p => p.Filters)
                .FirstOrDefaultAsync(p => p.Id == productId, cancellationToken);

            return product?.Filters.ToList() ?? [];
        });
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Gets filter groups by their IDs for batch loading (used by value converters).
    /// </summary>
    public async Task<List<ProductFilterGroup>> GetFilterGroupsByIds(IEnumerable<Guid> filterGroupIds, CancellationToken cancellationToken = default)
    {
        var idList = filterGroupIds.ToList();
        if (idList.Count == 0) return [];

        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.ProductFilterGroups
                .Include(g => g.Filters)
                .Where(g => idList.Contains(g.Id))
                .ToListAsync(cancellationToken));
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Gets filters by their IDs for batch loading (used by value converters).
    /// </summary>
    public async Task<List<ProductFilter>> GetFiltersByIds(IEnumerable<Guid> filterIds, CancellationToken cancellationToken = default)
    {
        var idList = filterIds.ToList();
        if (idList.Count == 0) return [];

        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.ProductFilters
                .Include(f => f.ParentGroup)
                .Where(f => idList.Contains(f.Id))
                .ToListAsync(cancellationToken));
        scope.Complete();
        return result;
    }
}
