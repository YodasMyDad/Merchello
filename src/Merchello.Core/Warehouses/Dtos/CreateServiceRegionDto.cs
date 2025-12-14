namespace Merchello.Core.Warehouses.Dtos;

/// <summary>
/// DTO for creating/updating a service region.
/// </summary>
public class CreateServiceRegionDto
{
    public required string CountryCode { get; set; }
    public string? StateOrProvinceCode { get; set; }
    public bool IsExcluded { get; set; }
}
