namespace Merchello.Core.HealthChecks.Dtos;

public class HealthCheckDetailItemDto
{
    public required string Id { get; set; }

    public required string Name { get; set; }

    public string? Description { get; set; }

    public string? EditPath { get; set; }

    public string? ImageUrl { get; set; }
}
