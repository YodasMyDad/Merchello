using System.ComponentModel.DataAnnotations;

namespace Merchello.Core.Products.Dtos;

/// <summary>
/// DTO to update an existing variant
/// </summary>
public class UpdateVariantDto
{
    public bool? Default { get; set; }

    [MaxLength(500)]
    public string? Name { get; set; }

    [MaxLength(150)]
    public string? Sku { get; set; }

    [MaxLength(150)]
    public string? Gtin { get; set; }

    [MaxLength(150)]
    public string? SupplierSku { get; set; }

    public decimal? Price { get; set; }
    public decimal? CostOfGoods { get; set; }
    public bool? OnSale { get; set; }
    public decimal? PreviousPrice { get; set; }
    public bool? AvailableForPurchase { get; set; }
    public bool? CanPurchase { get; set; }
    public List<Guid>? Images { get; set; }
    public bool? ExcludeRootProductImages { get; set; }

    [MaxLength(1000)]
    public string? Url { get; set; }

    /// <summary>
    /// HS Code for customs/tariff classification
    /// </summary>
    [MaxLength(10)]
    public string? HsCode { get; set; }

    /// <summary>
    /// Package configurations for shipping.
    /// If provided, overrides the root product's DefaultPackageConfigurations.
    /// </summary>
    public List<ProductPackageDto>? PackageConfigurations { get; set; }

    // Shopping Feed
    [MaxLength(150)]
    public string? ShoppingFeedTitle { get; set; }

    [MaxLength(1000)]
    public string? ShoppingFeedDescription { get; set; }

    [MaxLength(100)]
    public string? ShoppingFeedColour { get; set; }

    [MaxLength(100)]
    public string? ShoppingFeedMaterial { get; set; }

    [MaxLength(100)]
    public string? ShoppingFeedSize { get; set; }

    [MaxLength(150)]
    public string? ShoppingFeedBrand { get; set; }

    [MaxLength(20)]
    public string? ShoppingFeedCondition { get; set; }

    [MaxLength(100)]
    public string? ShoppingFeedWidth { get; set; }

    [MaxLength(100)]
    public string? ShoppingFeedHeight { get; set; }

    public bool? RemoveFromFeed { get; set; }

    /// <summary>
    /// Warehouse stock settings to update
    /// </summary>
    public List<UpdateWarehouseStockDto>? WarehouseStock { get; set; }
}
