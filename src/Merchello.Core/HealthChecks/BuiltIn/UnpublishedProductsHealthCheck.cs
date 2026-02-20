using Merchello.Core.Data;
using Merchello.Core.HealthChecks.Interfaces;
using Microsoft.EntityFrameworkCore;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.HealthChecks.BuiltIn;

public class UnpublishedProductsHealthCheck(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider) : IHealthCheck
{
    public HealthCheckMetadata Metadata => new()
    {
        Alias = "unpublished-products",
        Name = "Unpublished Products",
        Description = "Products or variants that are not available for purchase or have purchasing disabled.",
        Icon = "icon-block",
        SortOrder = 200,
    };

    public async Task<HealthCheckResult> ExecuteAsync(CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var count = await scope.ExecuteWithContextAsync(async db =>
            await db.Products
                .AsNoTracking()
                .Where(p => !p.AvailableForPurchase || !p.CanPurchase)
                .CountAsync(ct));
        scope.Complete();

        if (count == 0)
        {
            return new HealthCheckResult
            {
                Status = HealthCheckStatus.Success,
                Summary = "All products and variants are available for purchase.",
            };
        }

        return new HealthCheckResult
        {
            Status = HealthCheckStatus.Warning,
            Summary = $"{count} product{(count == 1 ? "" : "s")}/{(count == 1 ? "variant" : "variants")} not available for purchase.",
            AffectedCount = count,
        };
    }

    public async Task<HealthCheckDetailPage> GetDetailPageAsync(int page, int pageSize, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var (items, totalCount) = await scope.ExecuteWithContextAsync(async db =>
        {
            var query = db.Products
                .AsNoTracking()
                .Include(p => p.ProductRoot)
                .Where(p => !p.AvailableForPurchase || !p.CanPurchase)
                .OrderBy(p => p.ProductRoot!.RootName)
                .ThenBy(p => p.Name);

            var total = await query.CountAsync(ct);

            var results = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new
                {
                    p.Id,
                    p.ProductRootId,
                    RootName = p.ProductRoot!.RootName ?? "Unnamed",
                    VariantName = p.Name ?? "Default",
                    p.Sku,
                    p.AvailableForPurchase,
                    p.CanPurchase,
                })
                .ToListAsync(ct);

            var detail = results.Select(p =>
            {
                var reasons = new List<string>();
                if (!p.AvailableForPurchase) reasons.Add("Not visible on website");
                if (!p.CanPurchase) reasons.Add("Purchase disabled");

                return new HealthCheckDetailItem
                {
                    Id = p.Id.ToString(),
                    Name = $"{p.RootName} - {p.VariantName}",
                    Description = $"SKU: {p.Sku ?? "N/A"} | {string.Join(", ", reasons)}",
                    EditPath = $"section/merchello/workspace/merchello-products/edit/products/{p.ProductRootId}/variant/{p.Id}",
                };
            }).ToList();

            return (detail, total);
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
