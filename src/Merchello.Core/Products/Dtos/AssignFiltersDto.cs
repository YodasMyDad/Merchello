namespace Merchello.Core.Products.Dtos;

/// <summary>
/// DTO for assigning filters to a product
/// </summary>
public class AssignFiltersDto
{
    public List<Guid> FilterIds { get; set; } = [];
}
