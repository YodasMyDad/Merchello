namespace Merchello.Core.Products.Dtos;

/// <summary>
/// Product type data transfer object
/// </summary>
public class ProductTypeDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Alias { get; set; }
}
