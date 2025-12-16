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
/// Request to create a new product type
/// </summary>
public class CreateProductTypeRequest
{
    [Required]
    [MinLength(1)]
    public string Name { get; set; } = string.Empty;
}

/// <summary>
/// Request to update an existing product type
/// </summary>
public class UpdateProductTypeRequest
{
    [Required]
    [MinLength(1)]
    public string Name { get; set; } = string.Empty;
}
