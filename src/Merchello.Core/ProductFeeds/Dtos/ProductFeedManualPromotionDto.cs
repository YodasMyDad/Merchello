namespace Merchello.Core.ProductFeeds.Dtos;

public class ProductFeedManualPromotionDto
{
    public string PromotionId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool RequiresCouponCode { get; set; }
    public string? CouponCode { get; set; }
    public string? Description { get; set; }
    public DateTime? StartsAtUtc { get; set; }
    public DateTime? EndsAtUtc { get; set; }
    public int Priority { get; set; } = 1000;
    public decimal? PercentOff { get; set; }
    public decimal? AmountOff { get; set; }
    public ProductFeedFilterConfigDto FilterConfig { get; set; } = new();
}