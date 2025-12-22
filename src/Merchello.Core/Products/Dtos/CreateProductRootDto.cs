namespace Merchello.Core.Products.Dtos;

/// <summary>
/// DTO to create a new product root with a default variant
/// </summary>
public class CreateProductRootDto
{
    public string RootName { get; set; } = string.Empty;
    public Guid TaxGroupId { get; set; }
    public Guid ProductTypeId { get; set; }
    public List<Guid>? CollectionIds { get; set; }
    public List<Guid>? WarehouseIds { get; set; }
    public List<Guid>? RootImages { get; set; }
    public bool IsDigitalProduct { get; set; }

    /// <summary>
    /// Initial default variant configuration
    /// </summary>
    public CreateVariantDto DefaultVariant { get; set; } = new();
}
