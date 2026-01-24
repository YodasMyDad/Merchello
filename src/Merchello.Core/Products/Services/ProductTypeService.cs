using Merchello.Core.Data;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Products.Services;

public class ProductTypeService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    SlugHelper slugHelper,
    ILogger<ProductTypeService> logger) : IProductTypeService
{
    /// <summary>
    /// Creates a new ProductType with auto-generated slug alias
    /// </summary>
    public async Task<CrudResult<ProductType>> CreateProductType(
        string name,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<ProductType>();
        ProductType? productType = null;
        using var scope = efCoreScopeProvider.CreateScope();

        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var alias = slugHelper.GenerateSlug(name);

            var existingType = await db.ProductTypes
                .FirstOrDefaultAsync(pt => pt.Alias == alias, cancellationToken);

            if (existingType != null)
            {
                result.AddErrorMessage($"A product type with alias '{alias}' already exists");
                return;
            }

            productType = new ProductType
            {
                Id = Guid.NewGuid(),
                Name = name,
                Alias = alias
            };

            db.ProductTypes.Add(productType);
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
        });

        scope.Complete();
        result.ResultObject = productType;
        return result;
    }

    /// <summary>
    /// Updates an existing ProductType
    /// </summary>
    public async Task<CrudResult<ProductType>> UpdateProductType(
        Guid id,
        string name,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<ProductType>();
        ProductType? productType = null;
        using var scope = efCoreScopeProvider.CreateScope();

        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            productType = await db.ProductTypes.FirstOrDefaultAsync(pt => pt.Id == id, cancellationToken);

            if (productType == null)
            {
                result.AddErrorMessage("Product type not found");
                return;
            }

            var newAlias = slugHelper.GenerateSlug(name);

            var existingType = await db.ProductTypes
                .FirstOrDefaultAsync(pt => pt.Alias == newAlias && pt.Id != id, cancellationToken);

            if (existingType != null)
            {
                result.AddErrorMessage($"A product type with alias '{newAlias}' already exists");
                return;
            }

            productType.Name = name;
            productType.Alias = newAlias;

            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
        });

        scope.Complete();
        result.ResultObject = productType;
        return result;
    }

    /// <summary>
    /// Deletes a ProductType if it's not in use by any products
    /// </summary>
    public async Task<CrudResult<bool>> DeleteProductType(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();
        using var scope = efCoreScopeProvider.CreateScope();

        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var productType = await db.ProductTypes
                .Include(pt => pt.Products)
                .FirstOrDefaultAsync(pt => pt.Id == id, cancellationToken);

            if (productType == null)
            {
                result.AddErrorMessage("Product type not found");
                return;
            }

            if (productType.Products.Any())
            {
                result.AddErrorMessage($"Cannot delete product type '{productType.Name}' because it is assigned to {productType.Products.Count} product(s)");
                return;
            }

            db.ProductTypes.Remove(productType);
            await db.SaveChangesAsyncLogged(logger, result, cancellationToken);
            result.ResultObject = true;
        });

        scope.Complete();
        return result;
    }

    /// <summary>
    /// Gets all product types
    /// </summary>
    public async Task<List<ProductType>> GetProductTypes(CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.ProductTypes.AsNoTracking().OrderBy(pt => pt.Name).ToListAsync(cancellationToken));
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Get multiple product types by their IDs
    /// </summary>
    public async Task<List<ProductType>> GetProductTypesByIds(IEnumerable<Guid> productTypeIds, CancellationToken cancellationToken = default)
    {
        var idList = productTypeIds.ToList();
        if (idList.Count == 0)
        {
            return [];
        }

        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.ProductTypes
                .AsNoTracking()
                .Where(t => idList.Contains(t.Id))
                .ToListAsync(cancellationToken));
        scope.Complete();
        return result;
    }
}
