namespace Merchello.Core.Products.Dtos;

/// <summary>
/// Product collection data transfer object for list display
/// </summary>
public class ProductCollectionDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int ProductCount { get; set; }
}
