using Merchello.Core.Shared.Extensions;
using Merchello.Core.Warehouses.Models;

namespace Merchello.Core.Products.Models;

public class ProductWarehousePriceOverride
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;
    public Guid WarehouseId { get; set; }
    public Warehouse? Warehouse { get; set; }
    public Guid ProductId { get; set; }
    public Product? Product { get; set; }
    public decimal? Price { get; set; }
    public decimal? CostOfGoods { get; set; }

}
