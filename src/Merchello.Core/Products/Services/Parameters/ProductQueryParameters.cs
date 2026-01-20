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
    public List<Guid>? CollectionIds { get; set; }
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

    /// <summary>
    /// Minimum price filter. Products with price below this value will be excluded.
    /// </summary>
    public decimal? MinPrice { get; set; }

    /// <summary>
    /// Maximum price filter. Products with price above this value will be excluded.
    /// </summary>
    public decimal? MaxPrice { get; set; }

    /// <summary>
    /// Start date for popularity calculation. Only completed orders on or after this date are included.
    /// Used when OrderBy is set to Popularity.
    /// </summary>
    public DateTime? PopularityFromDate { get; set; }

    /// <summary>
    /// End date for popularity calculation. Only completed orders on or before this date are included.
    /// Used when OrderBy is set to Popularity.
    /// </summary>
    public DateTime? PopularityToDate { get; set; }
}
