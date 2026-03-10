namespace Merchello.Core.ProductFeeds.Dtos;

public class ProductFeedAutoDiscountConfigDto
{
    public bool IsEnabled { get; set; }
    public decimal MinProfitMarginPercent { get; set; } = 20m;
    public string? GoogleMerchantId { get; set; }
}
