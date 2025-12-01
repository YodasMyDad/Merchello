using Merchello.Core.Warehouses.Models;

namespace Merchello.Core.Products.Models;

public class ProductRootWarehouse
{
    public Guid ProductRootId { get; set; }
    public ProductRoot? ProductRoot { get; set; }

    public Guid WarehouseId { get; set; }
    public Warehouse? Warehouse { get; set; }

    public int PriorityOrder { get; set; }
}
