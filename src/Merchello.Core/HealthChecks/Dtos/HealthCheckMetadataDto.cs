namespace Merchello.Core.HealthChecks.Dtos;

public class HealthCheckMetadataDto
{
    public required string Alias { get; set; }

    public required string Name { get; set; }

    public required string Description { get; set; }

    public required string Icon { get; set; }

    public int SortOrder { get; set; }
}
