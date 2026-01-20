namespace Merchello.Core.Products.Dtos;

/// <summary>
/// DTO for creating a new filter within a group
/// </summary>
public class CreateFilterDto
{
    public required string Name { get; set; }
    public string? HexColour { get; set; }
    public Guid? Image { get; set; }
}
