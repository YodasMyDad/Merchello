namespace Merchello.Core.ProductFeeds.Models;

public class ProductFeedGenerationResult
{
    public string Xml { get; set; } = string.Empty;
    public int ItemCount { get; set; }
    public List<string> Warnings { get; set; } = [];
    public List<ProductFeedGeneratedItem> Items { get; set; } = [];
    public List<ProductFeedPromotionDefinition> ReferencedPromotions { get; set; } = [];
}