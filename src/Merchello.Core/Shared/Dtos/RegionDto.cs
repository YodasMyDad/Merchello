namespace Merchello.Core.Shared.Dtos;

/// <summary>
/// Region/state data for dropdowns and shipping configuration.
/// </summary>
public class RegionDto
{
    public string? CountryCode { get; set; }
    public string RegionCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}
