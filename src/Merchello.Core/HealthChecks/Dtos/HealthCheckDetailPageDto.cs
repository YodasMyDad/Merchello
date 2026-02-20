namespace Merchello.Core.HealthChecks.Dtos;

public class HealthCheckDetailPageDto
{
    public required IReadOnlyList<HealthCheckDetailItemDto> Items { get; set; }

    public int Page { get; set; }

    public int PageSize { get; set; }

    public int TotalItems { get; set; }

    public int TotalPages { get; set; }
}
