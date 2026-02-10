namespace Merchello.Core.Products.Dtos;

/// <summary>
/// DTO to create a new product root with a default variant
/// </summary>
public class CreateProductRootDto
{
    public string RootName { get; set; } = string.Empty;
    public string? GoogleShoppingFeedCategory { get; set; }
    public Guid TaxGroupId { get; set; }
    public Guid ProductTypeId { get; set; }
    public List<Guid>? CollectionIds { get; set; }
    public List<Guid>? WarehouseIds { get; set; }
    public List<Guid>? RootImages { get; set; }
    public bool IsDigitalProduct { get; set; }

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

    /// <summary>
    /// Alias of the selected Element Type for custom product properties.
    /// </summary>
    public string? ElementTypeAlias { get; set; }

    /// <summary>
    /// Element Type property values as { "propertyAlias": rawValue, ... }
    /// </summary>
    public Dictionary<string, object?>? ElementProperties { get; set; }

    /// <summary>
    /// Initial default variant configuration
    /// </summary>
    public CreateVariantDto DefaultVariant { get; set; } = new();
}
