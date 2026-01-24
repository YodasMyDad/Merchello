using Merchello.Core.Products.Dtos;
using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Models;

namespace Merchello.Core.Products.Services.Interfaces;

public interface IProductCollectionService
{
    Task<CrudResult<ProductCollection>> CreateProductCollection(string name, CancellationToken cancellationToken = default);
    Task<CrudResult<ProductCollection>> UpdateProductCollection(Guid id, string name, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> DeleteProductCollection(Guid id, CancellationToken cancellationToken = default);
    Task<List<ProductCollection>> GetProductCollections(CancellationToken cancellationToken = default);
    Task<List<ProductCollectionDto>> GetProductCollectionsWithCounts(CancellationToken cancellationToken = default);
    Task<ProductCollection?> GetCollection(Guid collectionId, CancellationToken cancellationToken = default);
    Task<List<ProductCollection>> GetCollectionsByIds(IEnumerable<Guid> collectionIds, CancellationToken cancellationToken = default);
}
