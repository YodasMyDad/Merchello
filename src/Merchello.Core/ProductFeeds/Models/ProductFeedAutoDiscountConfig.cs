namespace Merchello.Core.ProductFeeds.Models;

public class ProductFeedAutoDiscountConfig
{
    public bool IsEnabled { get; set; }
    public decimal MinProfitMarginPercent { get; set; } = 20m;
    public string? GoogleMerchantId { get; set; }
}
