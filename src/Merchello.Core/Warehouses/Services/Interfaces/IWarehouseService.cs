using Merchello.Core.Locality.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Models;
using Merchello.Core.Warehouses.Dtos;
using Merchello.Core.Warehouses.Models;
using Merchello.Core.Warehouses.Services.Parameters;

namespace Merchello.Core.Warehouses.Services.Interfaces;

public interface IWarehouseService
{
    /// <summary>
    /// Selects the best warehouse for a product based on priority, region serviceability, and stock availability
    /// </summary>
    /// <param name="parameters">Parameters for warehouse selection</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Warehouse selection result</returns>
    Task<WarehouseSelectionResult> SelectWarehouseForProduct(
        SelectWarehouseForProductParameters parameters,
        CancellationToken cancellationToken = default);

    // Warehouse CRUD Operations
    Task<CrudResult<Warehouse>> CreateWarehouse(CreateWarehouseParameters parameters, CancellationToken cancellationToken = default);
    Task<CrudResult<Warehouse>> UpdateWarehouse(UpdateWarehouseParameters parameters, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> DeleteWarehouse(Guid warehouseId, bool force = false, CancellationToken cancellationToken = default);
    Task<List<Warehouse>> GetWarehouses(CancellationToken cancellationToken = default);

    // ProductRootWarehouse Management
    Task<CrudResult<bool>> AddWarehouseToProductRoot(AddWarehouseToProductRootParameters parameters, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> RemoveWarehouseFromProductRoot(Guid productRootId, Guid warehouseId, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> UpdateWarehousePriority(UpdateWarehousePriorityParameters parameters, CancellationToken cancellationToken = default);

    // Stock Management
    Task<CrudResult<bool>> SetProductStock(SetProductStockParameters parameters, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> AdjustStock(StockAdjustmentParameters parameters, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> TransferStock(TransferStockParameters parameters, CancellationToken cancellationToken = default);
    Task<List<ProductStockLevel>> GetProductStockLevels(Guid productId, CancellationToken cancellationToken = default);
    Task<List<WarehouseInventoryItem>> GetWarehouseInventory(Guid warehouseId, bool lowStockOnly = false, CancellationToken cancellationToken = default);
    Task<List<WarehouseInventoryItem>> GetLowStockProducts(Guid? warehouseId = null, CancellationToken cancellationToken = default);

    // Warehouse List and Detail DTOs
    /// <summary>
    /// Gets all warehouses as list DTOs with summary data
    /// </summary>
    Task<List<WarehouseListDto>> GetWarehouseListAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a warehouse by ID as detail DTO with nested service regions
    /// </summary>
    Task<WarehouseDetailDto?> GetWarehouseDetailAsync(Guid warehouseId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a warehouse by ID
    /// </summary>
    Task<Warehouse?> GetWarehouseByIdAsync(Guid warehouseId, CancellationToken cancellationToken = default);

    // Service Region Management
    /// <summary>
    /// Adds a service region to a warehouse
    /// </summary>
    Task<CrudResult<WarehouseServiceRegion>> AddServiceRegionAsync(
        Guid warehouseId,
        CreateServiceRegionDto dto,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates a service region
    /// </summary>
    Task<CrudResult<WarehouseServiceRegion>> UpdateServiceRegionAsync(
        Guid warehouseId,
        Guid regionId,
        CreateServiceRegionDto dto,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes a service region
    /// </summary>
    Task<CrudResult<bool>> DeleteServiceRegionAsync(
        Guid warehouseId,
        Guid regionId,
        CancellationToken cancellationToken = default);
}

