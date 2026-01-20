namespace Merchello.Core.Products.Services.Parameters;

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
