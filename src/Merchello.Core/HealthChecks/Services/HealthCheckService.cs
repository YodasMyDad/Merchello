using Merchello.Core.HealthChecks.Interfaces;
using Merchello.Core.HealthChecks.Services.Interfaces;
using Merchello.Core.Shared.Reflection;

namespace Merchello.Core.HealthChecks.Services;

public class HealthCheckService(ExtensionManager extensionManager, IServiceProvider serviceProvider) : IHealthCheckService
{
    public Task<IReadOnlyList<HealthCheckMetadata>> GetAvailableChecksAsync(CancellationToken ct = default)
    {
        var checks = ResolveChecks();

        IReadOnlyList<HealthCheckMetadata> result = checks
            .Select(c => c.Metadata)
            .OrderBy(m => m.SortOrder)
            .ThenBy(m => m.Name)
            .ToList();

        return Task.FromResult(result);
    }

    public async Task<HealthCheckResult> RunCheckAsync(string alias, CancellationToken ct = default)
    {
        var check = ResolveCheck(alias);
        return await check.ExecuteAsync(ct);
    }

    public async Task<HealthCheckDetailPage> GetCheckDetailAsync(string alias, int page, int pageSize, CancellationToken ct = default)
    {
        var check = ResolveCheck(alias);
        return await check.GetDetailPageAsync(page, pageSize, ct);
    }

    private IHealthCheck ResolveCheck(string alias)
    {
        var check = ResolveChecks().FirstOrDefault(c =>
            string.Equals(c.Metadata.Alias, alias, StringComparison.OrdinalIgnoreCase));

        if (check is null)
        {
            throw new InvalidOperationException($"Health check '{alias}' not found.");
        }

        return check;
    }

    private List<IHealthCheck> ResolveChecks()
    {
        return extensionManager.GetInstances<IHealthCheck>(
                predicate: null,
                useCaching: true,
                serviceProvider: serviceProvider)
            .Where(c => c is not null)
            .Cast<IHealthCheck>()
            .ToList();
    }
}
