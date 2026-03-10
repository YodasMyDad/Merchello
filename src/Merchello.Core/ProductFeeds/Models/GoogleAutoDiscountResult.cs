namespace Merchello.Core.ProductFeeds.Models;

public class GoogleAutoDiscountResult
{
    public decimal DiscountedPrice { get; set; }
    public int DiscountPercentage { get; set; }
    public string DiscountCode { get; set; } = string.Empty;
    public string CurrencyCode { get; set; } = string.Empty;
    public string MerchantId { get; set; } = string.Empty;
    public string OfferId { get; set; } = string.Empty;
    public DateTime ExpiresUtc { get; set; }
}
