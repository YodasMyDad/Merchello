namespace Merchello.Core.HealthChecks;

public record HealthCheckMetadata
{
    public required string Alias { get; init; }

    public required string Name { get; init; }

    public required string Description { get; init; }

    public required string Icon { get; init; }

    public int SortOrder { get; init; } = 1000;
}
