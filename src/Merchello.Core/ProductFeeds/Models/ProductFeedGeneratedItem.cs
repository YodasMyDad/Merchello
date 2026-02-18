namespace Merchello.Core.ProductFeeds.Models;

public class ProductFeedGeneratedItem
{
    public Guid ProductId { get; set; }
    public Guid ProductRootId { get; set; }
    public List<string> PromotionIds { get; set; } = [];
}