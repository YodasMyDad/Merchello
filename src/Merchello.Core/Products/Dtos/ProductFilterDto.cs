namespace Merchello.Core.Products.Dtos;

/// <summary>
/// Data transfer object for a product filter
/// </summary>
public class ProductFilterDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public string? HexColour { get; set; }
    public Guid? Image { get; set; }
    public Guid FilterGroupId { get; set; }
    public int ProductCount { get; set; }
}
