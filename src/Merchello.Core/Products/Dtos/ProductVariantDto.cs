using Merchello.Core.Products.Models;

namespace Merchello.Core.Products.Dtos;

/// <summary>
/// Product variant for the product detail view
/// </summary>
public class ProductVariantDto
{
    public Guid Id { get; set; }
    public Guid ProductRootId { get; set; }
    public bool Default { get; set; }

    /// <summary>
    /// Whether this variant can be set as the default.
    /// Calculated by backend based on: AvailableForPurchase, CanPurchase, and stock availability
    /// in tracked warehouses. Frontend should use this instead of calculating eligibility locally.
    /// </summary>
    public bool CanBeDefault { get; set; }

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

    /// <summary>
    /// Total available stock across all warehouses (sum of AvailableStock per warehouse).
    /// </summary>
    public int TotalStock { get; set; }

    /// <summary>
    /// Total reserved stock across all warehouses (sum of ReservedStock per warehouse).
    /// </summary>
    public int TotalReservedStock { get; set; }

    /// <summary>
    /// Overall stock status for the variant across all warehouses.
    /// Calculated by backend to ensure consistency - frontend should use this
    /// instead of comparing totalStock to threshold locally.
    /// </summary>
    public StockStatus StockStatus { get; set; }

    /// <summary>
    /// Display label for the stock status (backend source of truth).
    /// </summary>
    public string StockStatusLabel { get; set; } = string.Empty;

    /// <summary>
    /// CSS class for stock status badges (backend source of truth).
    /// </summary>
    public string StockStatusCssClass { get; set; } = string.Empty;

    public List<VariantWarehouseStockDto> WarehouseStock { get; set; } = [];

    /// <summary>
    /// Current shipping restriction mode for this variant.
    /// </summary>
    public ShippingRestrictionMode ShippingRestrictionMode { get; set; }

    /// <summary>
    /// IDs of shipping options excluded for this specific variant.
    /// </summary>
    public List<Guid> ExcludedShippingOptionIds { get; set; } = [];

    /// <summary>
    /// Calculated display price in customer's currency, optionally including tax.
    /// Null when fetched without display context (e.g., admin API).
    /// </summary>
    public ProductDisplayPrice? DisplayPrice { get; set; }
}
