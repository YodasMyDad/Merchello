using Merchello.Core.Data;
using Merchello.Core.HealthChecks.Interfaces;
using Microsoft.EntityFrameworkCore;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.HealthChecks.BuiltIn;

public class OptionValuesMissingMediaHealthCheck(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider) : IHealthCheck
{
    public HealthCheckMetadata Metadata => new()
    {
        Alias = "option-values-missing-media",
        Name = "Option Values Missing Images",
        Description = "Product options configured to display as images but some values are missing their image.",
        Icon = "icon-grid",
        SortOrder = 400,
    };

    public async Task<HealthCheckResult> ExecuteAsync(CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var count = await scope.ExecuteWithContextAsync(async db =>
        {
            // ProductOptions is a JSON column (value-converted), so we cannot
            // filter on .Count in SQL. Load all roots with options and filter in memory.
            var roots = await db.RootProducts
                .AsNoTracking()
                .Select(pr => new { pr.ProductOptions })
                .ToListAsync(ct);

            return roots
                .SelectMany(r => r.ProductOptions)
                .Where(o => string.Equals(o.OptionUiAlias, "image", StringComparison.OrdinalIgnoreCase))
                .SelectMany(o => o.ProductOptionValues)
                .Count(v => v.MediaKey == null);
        });
        scope.Complete();

        if (count == 0)
        {
            return new HealthCheckResult
            {
                Status = HealthCheckStatus.Success,
                Summary = "All image-type option values have images assigned.",
            };
        }

        return new HealthCheckResult
        {
            Status = HealthCheckStatus.Warning,
            Summary = $"{count} option value{(count == 1 ? "" : "s")} missing image{(count == 1 ? "" : "s")}.",
            AffectedCount = count,
        };
    }

    public async Task<HealthCheckDetailPage> GetDetailPageAsync(int page, int pageSize, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var (items, totalCount) = await scope.ExecuteWithContextAsync(async db =>
        {
            // ProductOptions is a JSON column - load and filter in memory
            var roots = await db.RootProducts
                .AsNoTracking()
                .Select(pr => new
                {
                    pr.Id,
                    pr.RootName,
                    pr.ProductOptions,
                })
                .ToListAsync(ct);

            var allMissing = roots
                .SelectMany(r => r.ProductOptions
                    .Where(o => string.Equals(o.OptionUiAlias, "image", StringComparison.OrdinalIgnoreCase))
                    .SelectMany(o => o.ProductOptionValues
                        .Where(v => v.MediaKey == null)
                        .Select(v => new HealthCheckDetailItem
                        {
                            Id = $"{r.Id}:{o.Id}:{v.Id}",
                            Name = r.RootName ?? "Unnamed product",
                            Description = $"Option: {o.Name ?? "Unnamed"} | Value: {v.Name ?? "Unnamed"}",
                            EditPath = $"section/merchello/workspace/merchello-products/edit/products/{r.Id}",
                        })))
                .ToList();

            var total = allMissing.Count;
            var paged = allMissing
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
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
