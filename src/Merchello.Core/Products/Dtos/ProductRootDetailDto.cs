namespace Merchello.Core.Products.Dtos;

/// <summary>
/// Full product root with all variants and options for the product detail view
/// </summary>
public class ProductRootDetailDto
{
    public Guid Id { get; set; }
    public string RootName { get; set; } = string.Empty;
    public List<Guid> RootImages { get; set; } = [];
    public string? RootUrl { get; set; }
    public List<string> SellingPoints { get; set; } = [];
    public List<string> Videos { get; set; } = [];
    public string? GoogleShoppingFeedCategory { get; set; }
    public bool IsDigitalProduct { get; set; }

    /// <summary>
    /// Default package configurations for shipping.
    /// Variants inherit these unless they define their own.
    /// </summary>
    public List<ProductPackageDto> DefaultPackageConfigurations { get; set; } = [];

    public string? Description { get; set; }

    // SEO
    public string? MetaDescription { get; set; }
    public string? PageTitle { get; set; }
    public bool NoIndex { get; set; }
    public string? OpenGraphImage { get; set; }
    public string? CanonicalUrl { get; set; }

    // Related entities
    public Guid TaxGroupId { get; set; }
    public string? TaxGroupName { get; set; }
    public Guid ProductTypeId { get; set; }
    public string? ProductTypeName { get; set; }
    public List<Guid> CategoryIds { get; set; } = [];
    public List<Guid> WarehouseIds { get; set; } = [];

    // Options and variants
    public List<ProductOptionDto> ProductOptions { get; set; } = [];
    public List<ProductVariantDto> Variants { get; set; } = [];

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
