namespace Merchello.Core.Products.Models;

public enum ProductOrderBy
{
    PriceAsc,
    PriceDesc,
    ProductRoot,
    Popularity,
    DateCreated,
    DateUpdated,
    /// <summary>
    /// Order by warehouse priority. Only applies when WarehouseId filter is set.
    /// </summary>
    WarehousePriority
}
