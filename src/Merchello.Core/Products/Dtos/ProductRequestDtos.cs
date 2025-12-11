namespace Merchello.Core.Products.Dtos;

/// <summary>
/// Request to create a new product root with a default variant
/// </summary>
public class CreateProductRootRequest
{
    public string RootName { get; set; } = string.Empty;
    public Guid TaxGroupId { get; set; }
    public Guid ProductTypeId { get; set; }
    public List<Guid>? CategoryIds { get; set; }
    public List<Guid>? WarehouseIds { get; set; }
    public List<Guid>? RootImages { get; set; }
    public bool IsDigitalProduct { get; set; }

    /// <summary>
    /// Initial default variant configuration
    /// </summary>
    public CreateVariantRequest DefaultVariant { get; set; } = new();
}

/// <summary>
/// Request to update an existing product root
/// </summary>
public class UpdateProductRootRequest
{
    public string? RootName { get; set; }
    public List<Guid>? RootImages { get; set; }
    public string? RootUrl { get; set; }
    public List<string>? SellingPoints { get; set; }
    public List<string>? Videos { get; set; }
    public string? GoogleShoppingFeedCategory { get; set; }
    public bool? IsDigitalProduct { get; set; }
    public Guid? TaxGroupId { get; set; }
    public Guid? ProductTypeId { get; set; }
    public List<Guid>? CategoryIds { get; set; }
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
}

/// <summary>
/// Request to create a new variant
/// </summary>
public class CreateVariantRequest
{
    public string? Name { get; set; }
    public string? Sku { get; set; }
    public string? Gtin { get; set; }
    public decimal Price { get; set; }
    public decimal CostOfGoods { get; set; }
    public bool AvailableForPurchase { get; set; } = true;
    public bool CanPurchase { get; set; } = true;
}

/// <summary>
/// Request to update an existing variant
/// </summary>
public class UpdateVariantRequest
{
    public bool? Default { get; set; }
    public string? Name { get; set; }
    public string? Sku { get; set; }
    public string? Gtin { get; set; }
    public string? SupplierSku { get; set; }
    public decimal? Price { get; set; }
    public decimal? CostOfGoods { get; set; }
    public bool? OnSale { get; set; }
    public decimal? PreviousPrice { get; set; }
    public bool? AvailableForPurchase { get; set; }
    public bool? CanPurchase { get; set; }
    public List<Guid>? Images { get; set; }
    public bool? ExcludeRootProductImages { get; set; }
    public string? Url { get; set; }

    /// <summary>
    /// HS Code for customs/tariff classification
    /// </summary>
    public string? HsCode { get; set; }

    /// <summary>
    /// Package configurations for shipping.
    /// If provided, overrides the root product's DefaultPackageConfigurations.
    /// </summary>
    public List<ProductPackageDto>? PackageConfigurations { get; set; }

    // Shopping Feed
    public string? ShoppingFeedTitle { get; set; }
    public string? ShoppingFeedDescription { get; set; }
    public string? ShoppingFeedColour { get; set; }
    public string? ShoppingFeedMaterial { get; set; }
    public string? ShoppingFeedSize { get; set; }
    public bool? RemoveFromFeed { get; set; }
}

/// <summary>
/// Request to save a product option (create or update)
/// </summary>
public class SaveProductOptionRequest
{
    /// <summary>
    /// Null for new options, set for existing options to update
    /// </summary>
    public Guid? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Alias { get; set; }
    public int SortOrder { get; set; }
    public string? OptionTypeAlias { get; set; }
    public string? OptionUiAlias { get; set; }
    public bool IsVariant { get; set; }
    public List<SaveOptionValueRequest> Values { get; set; } = [];
}

/// <summary>
/// Request to save an option value (create or update)
/// </summary>
public class SaveOptionValueRequest
{
    /// <summary>
    /// Null for new values, set for existing values to update
    /// </summary>
    public Guid? Id { get; set; }
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
/// Request to update warehouse stock for a variant
/// </summary>
public class UpdateWarehouseStockRequest
{
    public Guid WarehouseId { get; set; }
    public int Stock { get; set; }
    public int? ReorderPoint { get; set; }
    public int? ReorderQuantity { get; set; }
    public bool TrackStock { get; set; } = true;
}
