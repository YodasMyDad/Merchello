namespace Merchello.Core.ProductFeeds.Dtos;

public class GoogleAutoDiscountActiveDto
{
    public decimal DiscountedPrice { get; set; }
    public int DiscountPercentage { get; set; }
    public string DiscountCode { get; set; } = string.Empty;
    public string CurrencyCode { get; set; } = string.Empty;
    public string OfferId { get; set; } = string.Empty;
    public DateTime PageExpiryUtc { get; set; }
    public DateTime CheckoutExpiryUtc { get; set; }
}
