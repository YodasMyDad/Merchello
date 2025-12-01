using Merchello.Core.Accounting.Models;
using Merchello.Core.Shared.Models;

namespace Merchello.Core.Products.Services.Interfaces;

public interface IInventoryService
{
    /// <summary>
    /// Reserves stock for an order. Skips if TrackStock is false for the product-warehouse combination.
    /// </summary>
    Task<CrudResult<bool>> ReserveStockAsync(Guid productId, Guid warehouseId, int quantity, CancellationToken cancellationToken = default);

    /// <summary>
    /// Releases a stock reservation (e.g., when order is cancelled). Skips if TrackStock is false.
    /// </summary>
    Task<CrudResult<bool>> ReleaseReservationAsync(Guid productId, Guid warehouseId, int quantity, CancellationToken cancellationToken = default);

    /// <summary>
    /// Allocates stock (deducts from Stock and ReservedStock when item ships). Skips if TrackStock is false.
    /// </summary>
    Task<CrudResult<bool>> AllocateStockAsync(Guid productId, Guid warehouseId, int quantity, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets available stock (Stock - ReservedStock). Returns int.MaxValue if not tracked.
    /// </summary>
    Task<int> GetAvailableStockAsync(Guid productId, Guid warehouseId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Validates if an order can be fulfilled based on available stock for tracked items.
    /// </summary>
    Task<CrudResult<bool>> ValidateStockAvailabilityAsync(Order order, CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks if stock tracking is enabled for a product-warehouse combination
    /// </summary>
    Task<bool> IsStockTrackedAsync(Guid productId, Guid warehouseId, CancellationToken cancellationToken = default);
}

