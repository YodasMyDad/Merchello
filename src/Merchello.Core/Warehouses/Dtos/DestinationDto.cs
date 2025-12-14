namespace Merchello.Core.Warehouses.Dtos;

/// <summary>
/// DTO for country/destination selection in shipping configuration.
/// </summary>
public class DestinationDto
{
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
}
