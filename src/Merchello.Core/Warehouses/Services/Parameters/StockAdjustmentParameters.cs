namespace Merchello.Core.Warehouses.Services.Parameters;

public class StockAdjustmentParameters
{
    public required Guid ProductId { get; set; }
    public required Guid WarehouseId { get; set; }
    public required int Adjustment { get; set; }
    public string? Reason { get; set; }
}

