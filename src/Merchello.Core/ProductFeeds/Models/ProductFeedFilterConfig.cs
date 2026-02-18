namespace Merchello.Core.ProductFeeds.Models;

public class ProductFeedFilterConfig
{
    public List<Guid> ProductTypeIds { get; set; } = [];
    public List<Guid> CollectionIds { get; set; } = [];
    public List<ProductFeedFilterValueGroup> FilterValueGroups { get; set; } = [];
}