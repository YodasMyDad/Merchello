using System.ComponentModel.DataAnnotations;

namespace Merchello.Core.Products.Dtos;

/// <summary>
/// DTO for updating an existing product type
/// </summary>
public class UpdateProductTypeDto
{
    [Required]
    [MinLength(1)]
    public string Name { get; set; } = string.Empty;
}
