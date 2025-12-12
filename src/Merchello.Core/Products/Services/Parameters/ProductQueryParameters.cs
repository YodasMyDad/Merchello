using Merchello.Core.Products.Models;

namespace Merchello.Core.Products.Services.Parameters;

public class ProductQueryParameters
{
    public int CurrentPage { get; set; } = 1;
    public int AmountPerPage { get; set; } = 20;
    public bool NoTracking { get; set; } = true;
    public ProductOrderBy OrderBy { get; set; } = ProductOrderBy.PriceAsc;
    public Guid? ProductTypeKey { get; set; }
    public Guid? ProductRootKey { get; set; }
    public string? ProductTypeAlias { get; set; }
    public List<Guid>? CategoryIds { get; set; }
    public List<Guid>? FilterKeys { get; set; }
    public bool AllVariants { get;set;}
    public bool IncludeProductWarehouses { get; set; } = false;
    public bool IncludeSiblingVariants { get; set; } = false;
    public bool IncludeProductRootWarehouses { get; set; } = false;

    /// <summary>
    /// Search term to filter products by name or SKU (case-insensitive).
    /// Applied at database level for optimal performance.
    /// </summary>
    public string? Search { get; set; }

    /// <summary>
    /// Filter by product availability status.
    /// </summary>
    public ProductAvailabilityFilter AvailabilityFilter { get; set; } = ProductAvailabilityFilter.All;

    /// <summary>
    /// Filter by stock status (in-stock, low-stock, out-of-stock).
    /// </summary>
    public ProductStockStatusFilter StockStatusFilter { get; set; } = ProductStockStatusFilter.All;

    /// <summary>
    /// Threshold for "low stock" status. Products with stock at or below this value
    /// (but greater than 0) are considered low stock. Default: 10.
    /// This should typically come from MerchelloSettings.LowStockThreshold.
    /// </summary>
    public int LowStockThreshold { get; set; } = 10;
}

/// <summary>
/// Filter options for product availability
/// </summary>
public enum ProductAvailabilityFilter
{
    /// <summary>All products regardless of availability</summary>
    All,
    /// <summary>Only products that are available for purchase</summary>
    Available,
    /// <summary>Only products that are unavailable for purchase</summary>
    Unavailable
}

/// <summary>
/// Filter options for product stock status
/// </summary>
public enum ProductStockStatusFilter
{
    /// <summary>All products regardless of stock</summary>
    All,
    /// <summary>Products with stock above the low stock threshold</summary>
    InStock,
    /// <summary>Products with stock between 1 and the low stock threshold</summary>
    LowStock,
    /// <summary>Products with zero stock</summary>
    OutOfStock
}

