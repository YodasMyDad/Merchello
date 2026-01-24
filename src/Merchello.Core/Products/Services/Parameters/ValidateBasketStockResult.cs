namespace Merchello.Core.Products.Services.Parameters;

public record ValidateBasketStockResult(bool IsValid, List<StockValidationItem> UnavailableItems);
