using Merchello.Core.Products.Models;

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
    public string? GoogleShoppingFeedCategory { get; set; }
    public bool IsDigitalProduct { get; set; }

    // Digital product settings (mapped from ExtendedData)

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
    /// Aggregate stock status across all variants.
    /// Calculated by backend - frontend should use this instead of deriving status locally.
    /// Digital products will be Untracked, physical products aggregate across variants.
    /// </summary>
    public StockStatus AggregateStockStatus { get; set; }

    /// <summary>
    /// Display label for aggregate stock status (backend source of truth).
    /// </summary>
    public string AggregateStockStatusLabel { get; set; } = string.Empty;

    /// <summary>
    /// CSS class for aggregate stock status badge (backend source of truth).
    /// </summary>
    public string AggregateStockStatusCssClass { get; set; } = string.Empty;

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
    public List<Guid> CollectionIds { get; set; } = [];
    public List<Guid> WarehouseIds { get; set; } = [];

    // Options and variants
    public List<ProductOptionDto> ProductOptions { get; set; } = [];
    public List<ProductVariantDto> Variants { get; set; } = [];

    /// <summary>
    /// Available shipping options from assigned warehouses with exclusion status.
    /// </summary>
    public List<ShippingOptionExclusionDto> AvailableShippingOptions { get; set; } = [];

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
