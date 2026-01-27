using Merchello.Core.Data;
using Merchello.Core.Products.Dtos;
using Merchello.Core.Products.Factories;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Products.Services;

public class ProductCollectionService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    ProductCollectionFactory productCollectionFactory,
    ILogger<ProductCollectionService> logger) : IProductCollectionService
{
    /// <summary>
    /// Creates a new ProductCollection
    /// </summary>
    public async Task<CrudResult<ProductCollection>> CreateProductCollection(
        string name,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<ProductCollection>();
        ProductCollection? collection = null;
        using var scope = efCoreScopeProvider.CreateScope();

        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            collection = productCollectionFactory.Create(name);

            db.ProductCollections.Add(collection);
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
            return true;
        });

        scope.Complete();
        result.ResultObject = collection;
        return result;
    }

    /// <summary>
    /// Updates a product collection
    /// </summary>
    public async Task<CrudResult<ProductCollection>> UpdateProductCollection(
        Guid id,
        string name,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<ProductCollection>();
        using var scope = efCoreScopeProvider.CreateScope();

        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var collection = await db.ProductCollections.FindAsync([id], cancellationToken);
            if (collection == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Collection not found",
                    ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
                });
                return false;
            }

            collection.Name = name;
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
            result.ResultObject = collection;
            return true;
        });

        scope.Complete();
        return result;
    }

    /// <summary>
    /// Deletes a product collection
    /// </summary>
    public async Task<CrudResult<bool>> DeleteProductCollection(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();
        using var scope = efCoreScopeProvider.CreateScope();

        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var collection = await db.ProductCollections
                .Include(c => c.Products)
                .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

            if (collection == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Collection not found",
                    ResultMessageType = Shared.Models.Enums.ResultMessageType.Error
                });
                return false;
            }

            // Remove collection from all products (clear the relationship)
            collection.Products.Clear();

            db.ProductCollections.Remove(collection);
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
            result.ResultObject = true;
            return true;
        });

        scope.Complete();
        return result;
    }

    /// <summary>
    /// Gets all product collections
    /// </summary>
    public async Task<List<ProductCollection>> GetProductCollections(CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.ProductCollections.AsNoTracking().OrderBy(pc => pc.Name).ToListAsync(cancellationToken));
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Gets all product collections with product counts
    /// </summary>
    public async Task<List<ProductCollectionDto>> GetProductCollectionsWithCounts(CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.ProductCollections
                .AsNoTracking()
                .OrderBy(pc => pc.Name)
                .Select(pc => new ProductCollectionDto
                {
                    Id = pc.Id,
                    Name = pc.Name ?? string.Empty,
                    ProductCount = pc.Products.Count
                })
                .ToListAsync(cancellationToken));
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Get a product collection by ID
    /// </summary>
    public async Task<ProductCollection?> GetCollection(Guid collectionId, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.ProductCollections
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == collectionId, cancellationToken));
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Get multiple product collections by their IDs
    /// </summary>
    public async Task<List<ProductCollection>> GetCollectionsByIds(IEnumerable<Guid> collectionIds, CancellationToken cancellationToken = default)
    {
        var idList = collectionIds.ToList();
        if (idList.Count == 0)
        {
            return [];
        }

        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.ProductCollections
                .AsNoTracking()
                .Where(c => idList.Contains(c.Id))
                .ToListAsync(cancellationToken));
        scope.Complete();
        return result;
    }
}
