using System.ComponentModel.DataAnnotations;

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

/// <summary>
/// DTO for creating a new product type
/// </summary>
public class CreateProductTypeDto
{
    [Required]
    [MinLength(1)]
    public string Name { get; set; } = string.Empty;
}

/// <summary>
/// DTO for updating an existing product type
/// </summary>
public class UpdateProductTypeDto
{
    [Required]
    [MinLength(1)]
    public string Name { get; set; } = string.Empty;
}
