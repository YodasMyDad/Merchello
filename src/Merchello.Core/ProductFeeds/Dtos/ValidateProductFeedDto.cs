namespace Merchello.Core.ProductFeeds.Dtos;

public class ValidateProductFeedDto
{
    public int? MaxIssues { get; set; }
    public List<Guid> PreviewProductIds { get; set; } = [];
}
