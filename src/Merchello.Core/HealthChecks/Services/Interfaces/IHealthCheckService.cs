namespace Merchello.Core.HealthChecks.Services.Interfaces;

public interface IHealthCheckService
{
    Task<IReadOnlyList<HealthCheckMetadata>> GetAvailableChecksAsync(CancellationToken ct = default);

    Task<HealthCheckResult> RunCheckAsync(string alias, CancellationToken ct = default);

    Task<HealthCheckDetailPage> GetCheckDetailAsync(string alias, int page, int pageSize, CancellationToken ct = default);
}
