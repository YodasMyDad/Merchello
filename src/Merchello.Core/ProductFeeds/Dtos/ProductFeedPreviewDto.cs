namespace Merchello.Core.ProductFeeds.Dtos;

public class ProductFeedPreviewDto
{
    public int ProductItemCount { get; set; }
    public int PromotionCount { get; set; }
    public List<string> Warnings { get; set; } = [];
    public List<string> SampleProductIds { get; set; } = [];
    public string? Error { get; set; }
}
