using Merchello.Core.Locality.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Models;
using Merchello.Core.Warehouses.Models;
using Merchello.Core.Warehouses.Services.Parameters;

namespace Merchello.Core.Warehouses.Services.Interfaces;

public interface IWarehouseService
{
    /// <summary>
    /// Selects the best warehouse for a product based on priority, region serviceability, and stock availability
    /// </summary>
    /// <param name="product">The product to ship</param>
    /// <param name="shippingAddress">The destination address</param>
    /// <param name="quantity">Required quantity</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Warehouse selection result</returns>
    Task<WarehouseSelectionResult> SelectWarehouseForProduct(
        Product product,
        Address shippingAddress,
        int quantity = 1,
        CancellationToken cancellationToken = default);

    // Warehouse CRUD Operations
    Task<CrudResult<Warehouse>> CreateWarehouse(CreateWarehouseParameters parameters, CancellationToken cancellationToken = default);
    Task<CrudResult<Warehouse>> UpdateWarehouse(UpdateWarehouseParameters parameters, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> DeleteWarehouse(Guid warehouseId, bool force = false, CancellationToken cancellationToken = default);
    Task<List<Warehouse>> GetWarehouses(CancellationToken cancellationToken = default);

    // ProductRootWarehouse Management
    Task<CrudResult<bool>> AddWarehouseToProductRoot(Guid productRootId, Guid warehouseId, int priorityOrder, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> RemoveWarehouseFromProductRoot(Guid productRootId, Guid warehouseId, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> UpdateWarehousePriority(Guid productRootId, Guid warehouseId, int newPriorityOrder, CancellationToken cancellationToken = default);

    // Stock Management
    Task<CrudResult<bool>> SetProductStock(Guid productId, Guid warehouseId, int stock, int? reorderPoint = null, int? reorderQuantity = null, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> AdjustStock(StockAdjustmentParameters parameters, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> TransferStock(Guid productId, Guid fromWarehouseId, Guid toWarehouseId, int quantity, CancellationToken cancellationToken = default);
    Task<List<ProductStockLevel>> GetProductStockLevels(Guid productId, CancellationToken cancellationToken = default);
    Task<List<WarehouseInventoryItem>> GetWarehouseInventory(Guid warehouseId, bool lowStockOnly = false, CancellationToken cancellationToken = default);
    Task<List<WarehouseInventoryItem>> GetLowStockProducts(Guid? warehouseId = null, CancellationToken cancellationToken = default);
}

