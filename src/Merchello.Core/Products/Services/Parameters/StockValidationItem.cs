namespace Merchello.Core.Products.Services.Parameters;

public record StockValidationItem(
    Guid ProductId,
    string ProductName,
    int Requested,
    int Available,
    Guid WarehouseId);
