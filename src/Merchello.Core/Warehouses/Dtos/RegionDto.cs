namespace Merchello.Core.Warehouses.Dtos;

/// <summary>
/// DTO for region/state selection in shipping configuration.
/// </summary>
public class RegionDto
{
    public string RegionCode { get; set; } = null!;
    public string Name { get; set; } = null!;
}
