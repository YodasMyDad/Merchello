using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Models;

namespace Merchello.Core.Products.Services.Interfaces;

public interface IProductTypeService
{
    Task<CrudResult<ProductType>> CreateProductType(string name, CancellationToken cancellationToken = default);
    Task<CrudResult<ProductType>> UpdateProductType(Guid id, string name, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> DeleteProductType(Guid id, CancellationToken cancellationToken = default);
    Task<List<ProductType>> GetProductTypes(CancellationToken cancellationToken = default);
    Task<List<ProductType>> GetProductTypesByIds(IEnumerable<Guid> productTypeIds, CancellationToken cancellationToken = default);
}
