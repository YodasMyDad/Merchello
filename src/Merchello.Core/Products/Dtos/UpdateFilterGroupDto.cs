namespace Merchello.Core.Products.Dtos;

/// <summary>
/// DTO for updating a filter group
/// </summary>
public class UpdateFilterGroupDto
{
    public string? Name { get; set; }
    public int? SortOrder { get; set; }
}
