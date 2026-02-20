namespace Merchello.Core.HealthChecks.Dtos;

public class HealthCheckResultDto
{
    public required string Alias { get; set; }

    public required string Name { get; set; }

    public required string Description { get; set; }

    public required string Icon { get; set; }

    public required string Status { get; set; }

    public required string Summary { get; set; }

    public int AffectedCount { get; set; }
}
