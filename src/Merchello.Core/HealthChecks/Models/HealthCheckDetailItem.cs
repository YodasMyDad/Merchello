namespace Merchello.Core.HealthChecks;

public record HealthCheckDetailItem
{
    public required string Id { get; init; }

    public required string Name { get; init; }

    public string? Description { get; init; }

    public string? EditPath { get; init; }

    public string? ImageUrl { get; init; }
}
