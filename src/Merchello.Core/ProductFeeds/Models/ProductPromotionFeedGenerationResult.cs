namespace Merchello.Core.ProductFeeds.Models;

public class ProductPromotionFeedGenerationResult
{
    public string Xml { get; set; } = string.Empty;
    public int PromotionCount { get; set; }
    public List<string> Warnings { get; set; } = [];
}