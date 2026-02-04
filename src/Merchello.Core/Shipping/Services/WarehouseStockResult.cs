using Merchello.Core.Shipping.Dtos;

namespace Merchello.Core.Shipping.Services;

/// <summary>
/// Result of warehouse stock calculation for a product.
/// </summary>
internal sealed record WarehouseStockResult(
    int TotalAvailableStock,
    bool HasAnyStock,
    bool HasAnyTrackingWarehouse,
    FulfillmentWarehouseDto? FulfillingWarehouse);
