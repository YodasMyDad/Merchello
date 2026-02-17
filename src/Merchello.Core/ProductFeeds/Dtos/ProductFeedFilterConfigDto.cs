namespace Merchello.Core.ProductFeeds.Dtos;

public class ProductFeedFilterConfigDto
{
    public List<Guid> ProductTypeIds { get; set; } = [];
    public List<Guid> CollectionIds { get; set; } = [];
    public List<ProductFeedFilterValueGroupDto> FilterValueGroups { get; set; } = [];
}