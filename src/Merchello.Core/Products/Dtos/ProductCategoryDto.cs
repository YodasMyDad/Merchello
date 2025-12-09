namespace Merchello.Core.Products.Dtos;

/// <summary>
/// Product category data transfer object
/// </summary>
public class ProductCategoryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
}
