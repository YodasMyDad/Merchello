namespace Merchello.Core.Products.Dtos;

/// <summary>
/// DTO for updating a filter
/// </summary>
public class UpdateFilterDto
{
    public string? Name { get; set; }
    public string? HexColour { get; set; }
    public Guid? Image { get; set; }
    public int? SortOrder { get; set; }
}
