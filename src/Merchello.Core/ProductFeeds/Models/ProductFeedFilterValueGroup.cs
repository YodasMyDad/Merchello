namespace Merchello.Core.ProductFeeds.Models;

public class ProductFeedFilterValueGroup
{
    public Guid FilterGroupId { get; set; }
    public List<Guid> FilterIds { get; set; } = [];
}