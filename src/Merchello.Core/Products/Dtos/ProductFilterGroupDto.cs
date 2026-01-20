namespace Merchello.Core.Products.Dtos;

/// <summary>
/// Data transfer object for a product filter group with its filters
/// </summary>
public class ProductFilterGroupDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public List<ProductFilterDto> Filters { get; set; } = [];
}
