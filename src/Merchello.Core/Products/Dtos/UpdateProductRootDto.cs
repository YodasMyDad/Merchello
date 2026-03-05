using System.ComponentModel.DataAnnotations;

namespace Merchello.Core.Products.Dtos;

/// <summary>
/// DTO to update an existing product root
/// </summary>
public class UpdateProductRootDto
{
    public string? RootName { get; set; }
    public List<Guid>? RootImages { get; set; }

    [MaxLength(1000)]
    public string? RootUrl { get; set; }

    [MaxLength(1000)]
    public string? GoogleShoppingFeedCategory { get; set; }

    [MaxLength(150)]
    public string? ShoppingFeedBrand { get; set; }

    [MaxLength(20)]
    public string? ShoppingFeedCondition { get; set; }
    public bool? IsDigitalProduct { get; set; }

    // Digital product settings (mapped to/from ExtendedData)

    /// <summary>
    /// How digital products are delivered: "InstantDownload" or "EmailDelivered".
    /// </summary>
    public string? DigitalDeliveryMethod { get; set; }

    /// <summary>
    /// List of Umbraco Media IDs for digital files.
    /// </summary>
    public List<string>? DigitalFileIds { get; set; }

    /// <summary>
    /// Number of days download links remain valid. 0 = never expires.
    /// </summary>
    public int? DownloadLinkExpiryDays { get; set; }

    /// <summary>
    /// Maximum downloads per link. 0 = unlimited.
    /// </summary>
    public int? MaxDownloadsPerLink { get; set; }

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
    [MaxLength(200)]
    public string? MetaDescription { get; set; }

    [MaxLength(100)]
    public string? PageTitle { get; set; }
    public bool? NoIndex { get; set; }

    [MaxLength(50)]
    public string? OpenGraphImage { get; set; }

    [MaxLength(1000)]
    public string? CanonicalUrl { get; set; }

    /// <summary>
    /// Element Type property values as { "propertyAlias": rawValue, ... }
    /// </summary>
    public Dictionary<string, object?>? ElementProperties { get; set; }

    /// <summary>
    /// Alias of the selected Element Type for custom product properties.
    /// </summary>
    [MaxLength(200)]
    public string? ElementTypeAlias { get; set; }

    /// <summary>
    /// The view alias used to render this product on the front-end.
    /// Example: "Gallery" -> ~/Views/Products/Gallery.cshtml
    /// </summary>
    [MaxLength(200)]
    public string? ViewAlias { get; set; }
}
