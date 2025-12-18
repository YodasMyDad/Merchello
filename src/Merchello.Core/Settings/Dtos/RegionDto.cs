namespace Merchello.Core.Settings.Dtos;

/// <summary>
/// Region/state data for dropdowns
/// </summary>
public class RegionDto
{
    public string CountryCode { get; set; } = string.Empty;
    public string RegionCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}
