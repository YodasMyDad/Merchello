namespace Merchello.Core.Warehouses.Dtos;

/// <summary>
/// DTO for service region entries.
/// </summary>
public class ServiceRegionDto
{
    public Guid Id { get; set; }
    public string CountryCode { get; set; } = null!;
    public string? RegionCode { get; set; }
    public bool IsExcluded { get; set; }

    /// <summary>
    /// Display-friendly region name (e.g., "United States" or "California, US").
    /// </summary>
    public string? RegionDisplay { get; set; }
}
