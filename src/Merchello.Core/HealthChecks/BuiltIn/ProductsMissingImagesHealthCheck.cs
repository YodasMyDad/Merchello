using Merchello.Core.Data;
using Merchello.Core.HealthChecks.Interfaces;
using Microsoft.EntityFrameworkCore;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.HealthChecks.BuiltIn;

public class ProductsMissingImagesHealthCheck(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider) : IHealthCheck
{
    public HealthCheckMetadata Metadata => new()
    {
        Alias = "products-missing-images",
        Name = "Products Missing Images",
        Description = "Products without any images may display poorly on the storefront.",
        Icon = "icon-picture",
        SortOrder = 300,
    };

    public async Task<HealthCheckResult> ExecuteAsync(CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var count = await scope.ExecuteWithContextAsync(async db =>
        {
            // RootImages and Images are JSON columns (value-converted List<string>),
            // so we cannot filter on .Count in SQL. Load the columns and filter in memory.
            var roots = await db.RootProducts
                .AsNoTracking()
                .Select(pr => new { pr.Id, pr.RootImages })
                .ToListAsync(ct);

            var noImageRootIds = roots
                .Where(r => r.RootImages.Count == 0)
                .Select(r => r.Id)
                .ToHashSet();

            if (noImageRootIds.Count == 0) return 0;

            // Load variant images only for roots that have no root images
            var variants = await db.Products
                .AsNoTracking()
                .Where(p => noImageRootIds.Contains(p.ProductRootId))
                .Select(p => new { p.ProductRootId, p.Images })
                .ToListAsync(ct);

            var rootsWithVariantImages = variants
                .Where(v => v.Images.Count > 0)
                .Select(v => v.ProductRootId)
                .ToHashSet();

            return noImageRootIds.Count(id => !rootsWithVariantImages.Contains(id));
        });
        scope.Complete();

        if (count == 0)
        {
            return new HealthCheckResult
            {
                Status = HealthCheckStatus.Success,
                Summary = "All products have at least one image.",
            };
        }

        return new HealthCheckResult
        {
            Status = HealthCheckStatus.Warning,
            Summary = $"{count} product{(count == 1 ? "" : "s")} without any images.",
            AffectedCount = count,
        };
    }

    public async Task<HealthCheckDetailPage> GetDetailPageAsync(int page, int pageSize, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var (items, totalCount) = await scope.ExecuteWithContextAsync(async db =>
        {
            // Load root images (JSON column) and filter in memory
            var roots = await db.RootProducts
                .AsNoTracking()
                .Select(pr => new { pr.Id, pr.RootName, pr.RootImages })
                .ToListAsync(ct);

            var noImageRoots = roots
                .Where(r => r.RootImages.Count == 0)
                .ToList();

            if (noImageRoots.Count == 0)
                return (new List<HealthCheckDetailItem>(), 0);

            var noImageRootIds = noImageRoots.Select(r => r.Id).ToHashSet();

            // Load variant images for those roots
            var variants = await db.Products
                .AsNoTracking()
                .Where(p => noImageRootIds.Contains(p.ProductRootId))
                .Select(p => new { p.ProductRootId, p.Images })
                .ToListAsync(ct);

            var rootsWithVariantImages = variants
                .Where(v => v.Images.Count > 0)
                .Select(v => v.ProductRootId)
                .ToHashSet();

            var filtered = noImageRoots
                .Where(r => !rootsWithVariantImages.Contains(r.Id))
                .OrderBy(r => r.RootName)
                .ToList();

            var total = filtered.Count;
            var paged = filtered
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(pr => new HealthCheckDetailItem
                {
                    Id = pr.Id.ToString(),
                    Name = pr.RootName ?? "Unnamed product",
                    EditPath = $"section/merchello/workspace/merchello-products/edit/products/{pr.Id}",
                })
                .ToList();

            return (paged, total);
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
