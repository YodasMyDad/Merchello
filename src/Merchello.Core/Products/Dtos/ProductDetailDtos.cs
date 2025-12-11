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
}

/// <summary>
/// Product option for the product detail view
/// </summary>
public class ProductOptionDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Alias { get; set; }
    public int SortOrder { get; set; }
    public string? OptionTypeAlias { get; set; }
    public string? OptionUiAlias { get; set; }
    public bool IsVariant { get; set; }
    public List<ProductOptionValueDto> Values { get; set; } = [];
}

/// <summary>
/// Product option value for the product detail view
/// </summary>
public class ProductOptionValueDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public int SortOrder { get; set; }
    public string? HexValue { get; set; }
    public Guid? MediaKey { get; set; }
    public decimal PriceAdjustment { get; set; }
    public decimal CostAdjustment { get; set; }
    public string? SkuSuffix { get; set; }
}

/// <summary>
/// Product variant for the product detail view
/// </summary>
public class ProductVariantDto
{
    public Guid Id { get; set; }
    public Guid ProductRootId { get; set; }
    public bool Default { get; set; }
    public string? Name { get; set; }
    public string? Sku { get; set; }
    public string? Gtin { get; set; }
    public string? SupplierSku { get; set; }
    public decimal Price { get; set; }
    public decimal CostOfGoods { get; set; }
    public bool OnSale { get; set; }
    public decimal? PreviousPrice { get; set; }
    public bool AvailableForPurchase { get; set; }
    public bool CanPurchase { get; set; }
    public List<Guid> Images { get; set; } = [];
    public bool ExcludeRootProductImages { get; set; }
    public string? Url { get; set; }
    public string? VariantOptionsKey { get; set; }

    /// <summary>
    /// HS Code for customs/tariff classification (variant-level)
    /// </summary>
    public string? HsCode { get; set; }

    /// <summary>
    /// Package configurations for shipping.
    /// If empty, inherits from ProductRoot.DefaultPackageConfigurations.
    /// </summary>
    public List<ProductPackageDto> PackageConfigurations { get; set; } = [];

    // Shopping Feed
    public string? ShoppingFeedTitle { get; set; }
    public string? ShoppingFeedDescription { get; set; }
    public string? ShoppingFeedColour { get; set; }
    public string? ShoppingFeedMaterial { get; set; }
    public string? ShoppingFeedSize { get; set; }
    public bool RemoveFromFeed { get; set; }

    // Stock (aggregated from ProductWarehouses)
    public int TotalStock { get; set; }
    public List<VariantWarehouseStockDto> WarehouseStock { get; set; } = [];
}

/// <summary>
/// Warehouse stock information for a variant
/// </summary>
public class VariantWarehouseStockDto
{
    public Guid WarehouseId { get; set; }
    public string? WarehouseName { get; set; }
    public int Stock { get; set; }
    public int? ReorderPoint { get; set; }
    public int? ReorderQuantity { get; set; }
    public bool TrackStock { get; set; }
}

/// <summary>
/// Package configuration for shipping calculations
/// </summary>
public class ProductPackageDto
{
    /// <summary>
    /// Package weight in kilograms
    /// </summary>
    public decimal Weight { get; set; }

    /// <summary>
    /// Package length in centimeters
    /// </summary>
    public decimal? LengthCm { get; set; }

    /// <summary>
    /// Package width in centimeters
    /// </summary>
    public decimal? WidthCm { get; set; }

    /// <summary>
    /// Package height in centimeters
    /// </summary>
    public decimal? HeightCm { get; set; }
}
