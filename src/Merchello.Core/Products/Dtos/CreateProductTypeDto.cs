using System.ComponentModel.DataAnnotations;

namespace Merchello.Core.Products.Dtos;

/// <summary>
/// DTO for creating a new product type
/// </summary>
public class CreateProductTypeDto
{
    [Required]
    [MinLength(1)]
    public string Name { get; set; } = string.Empty;
}
