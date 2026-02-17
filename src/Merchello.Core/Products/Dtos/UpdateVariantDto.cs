namespace Merchello.Core.Products.Dtos;

/// <summary>
/// DTO to update an existing variant
/// </summary>
public class UpdateVariantDto
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
    public string? ShoppingFeedBrand { get; set; }
    public string? ShoppingFeedCondition { get; set; }
    public string? ShoppingFeedWidth { get; set; }
    public string? ShoppingFeedHeight { get; set; }
    public bool? RemoveFromFeed { get; set; }

    /// <summary>
    /// Warehouse stock settings to update
    /// </summary>
    public List<UpdateWarehouseStockDto>? WarehouseStock { get; set; }
}
