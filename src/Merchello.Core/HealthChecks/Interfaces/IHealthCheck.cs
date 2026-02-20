namespace Merchello.Core.HealthChecks.Interfaces;

public interface IHealthCheck
{
    HealthCheckMetadata Metadata { get; }

    Task<HealthCheckResult> ExecuteAsync(CancellationToken ct = default);

    Task<HealthCheckDetailPage> GetDetailPageAsync(int page, int pageSize, CancellationToken ct = default);
}
