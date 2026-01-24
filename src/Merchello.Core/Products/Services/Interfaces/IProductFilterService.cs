using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Parameters;
using Merchello.Core.Shared.Models;

namespace Merchello.Core.Products.Services.Interfaces;

public interface IProductFilterService
{
    Task<List<ProductFilterGroup>> GetFilterGroups(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets filter groups containing only filters that have products in the specified collection.
    /// Empty groups (with no relevant filters) are excluded.
    /// </summary>
    Task<List<ProductFilterGroup>> GetFilterGroupsForCollection(Guid collectionId, CancellationToken cancellationToken = default);

    Task<CrudResult<ProductFilterGroup>> CreateFilterGroup(string name, CancellationToken cancellationToken = default);
    Task<CrudResult<ProductFilter>> CreateFilter(CreateFilterParameters parameters, CancellationToken cancellationToken = default);
    Task<ProductFilterGroup?> GetFilterGroup(Guid filterGroupId, CancellationToken cancellationToken = default);
    Task<CrudResult<ProductFilterGroup>> UpdateFilterGroup(Guid filterGroupId, string? name, int? sortOrder, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> DeleteFilterGroup(Guid filterGroupId, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> ReorderFilterGroups(List<Guid> orderedIds, CancellationToken cancellationToken = default);
    Task<ProductFilter?> GetFilter(Guid filterId, CancellationToken cancellationToken = default);
    Task<CrudResult<ProductFilter>> UpdateFilter(UpdateFilterParameters parameters, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> DeleteFilter(Guid filterId, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> ReorderFilters(Guid filterGroupId, List<Guid> orderedIds, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> AssignFiltersToProduct(Guid productId, List<Guid> filterIds, CancellationToken cancellationToken = default);
    Task<List<ProductFilter>> GetFiltersForProduct(Guid productId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets filter groups by their IDs for batch loading (used by value converters).
    /// </summary>
    Task<List<ProductFilterGroup>> GetFilterGroupsByIds(IEnumerable<Guid> filterGroupIds, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets filters by their IDs for batch loading (used by value converters).
    /// </summary>
    Task<List<ProductFilter>> GetFiltersByIds(IEnumerable<Guid> filterIds, CancellationToken cancellationToken = default);
}
