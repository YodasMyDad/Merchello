using Merchello.Core.Data;
using Merchello.Core.HealthChecks.Interfaces;
using Microsoft.EntityFrameworkCore;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.HealthChecks.BuiltIn;

public class ProductsMissingWarehousesHealthCheck(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider) : IHealthCheck
{
    public HealthCheckMetadata Metadata => new()
    {
        Alias = "products-missing-warehouses",
        Name = "Products Missing Warehouses",
        Description = "Physical products that have no warehouse assigned cannot be shipped or have stock tracked.",
        Icon = "icon-box",
        SortOrder = 100,
    };

    public async Task<HealthCheckResult> ExecuteAsync(CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var count = await scope.ExecuteWithContextAsync(async db =>
            await db.RootProducts
                .AsNoTracking()
                .Where(pr => !pr.IsDigitalProduct)
                .Where(pr => !pr.ProductRootWarehouses.Any())
                .CountAsync(ct));
        scope.Complete();

        if (count == 0)
        {
            return new HealthCheckResult
            {
                Status = HealthCheckStatus.Success,
                Summary = "All physical products have a warehouse assigned.",
            };
        }

        return new HealthCheckResult
        {
            Status = HealthCheckStatus.Error,
            Summary = $"{count} physical product{(count == 1 ? "" : "s")} without a warehouse.",
            AffectedCount = count,
        };
    }

    public async Task<HealthCheckDetailPage> GetDetailPageAsync(int page, int pageSize, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var (items, totalCount) = await scope.ExecuteWithContextAsync(async db =>
        {
            var query = db.RootProducts
                .AsNoTracking()
                .Where(pr => !pr.IsDigitalProduct)
                .Where(pr => !pr.ProductRootWarehouses.Any())
                .OrderBy(pr => pr.RootName);

            var total = await query.CountAsync(ct);

            var results = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(pr => new HealthCheckDetailItem
                {
                    Id = pr.Id.ToString(),
                    Name = pr.RootName ?? "Unnamed product",
                    EditPath = $"section/merchello/workspace/merchello-products/edit/products/{pr.Id}",
                })
                .ToListAsync(ct);

            return (results, total);
        });
        scope.Complete();

        return new HealthCheckDetailPage
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalItems = totalCount,
            TotalPages = (int)Math.Ceiling((double)totalCount / pageSize),
        };
    }
}
