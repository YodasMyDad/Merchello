namespace Merchello.Core.ProductFeeds.Dtos;

public class ProductFeedFilterValueGroupDto
{
    public Guid FilterGroupId { get; set; }
    public List<Guid> FilterIds { get; set; } = [];
}