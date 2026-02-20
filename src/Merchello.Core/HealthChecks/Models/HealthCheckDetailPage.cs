namespace Merchello.Core.HealthChecks;

public record HealthCheckDetailPage
{
    public required IReadOnlyList<HealthCheckDetailItem> Items { get; init; }

    public int Page { get; init; }

    public int PageSize { get; init; }

    public int TotalItems { get; init; }

    public int TotalPages { get; init; }
}
