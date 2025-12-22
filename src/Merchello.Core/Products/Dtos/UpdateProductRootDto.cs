namespace Merchello.Core.Products.Dtos;

/// <summary>
/// DTO to update an existing product root
/// </summary>
public class UpdateProductRootDto
{
    public string? RootName { get; set; }
    public List<Guid>? RootImages { get; set; }
    public string? RootUrl { get; set; }
    public string? GoogleShoppingFeedCategory { get; set; }
    public bool? IsDigitalProduct { get; set; }
    public Guid? TaxGroupId { get; set; }
    public Guid? ProductTypeId { get; set; }
    public List<Guid>? CollectionIds { get; set; }
    public List<Guid>? WarehouseIds { get; set; }

    /// <summary>
    /// Default package configurations for shipping.
    /// Variants inherit these unless they define their own.
    /// </summary>
    public List<ProductPackageDto>? DefaultPackageConfigurations { get; set; }

    public string? Description { get; set; }

    // SEO
    public string? MetaDescription { get; set; }
    public string? PageTitle { get; set; }
    public bool? NoIndex { get; set; }
    public string? OpenGraphImage { get; set; }
    public string? CanonicalUrl { get; set; }

    /// <summary>
    /// Element Type property values as { "propertyAlias": rawValue, ... }
    /// </summary>
    public Dictionary<string, object?>? ElementProperties { get; set; }

    /// <summary>
    /// The view alias used to render this product on the front-end.
    /// Example: "Gallery" -> ~/Views/Products/Gallery.cshtml
    /// </summary>
    public string? ViewAlias { get; set; }
}
