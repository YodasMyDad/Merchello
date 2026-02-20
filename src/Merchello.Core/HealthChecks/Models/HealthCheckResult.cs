namespace Merchello.Core.HealthChecks;

public record HealthCheckResult
{
    public required HealthCheckStatus Status { get; init; }

    public required string Summary { get; init; }

    public int AffectedCount { get; init; }
}
