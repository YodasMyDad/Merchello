namespace Merchello.Core.ProductFeeds.Dtos;

public class ProductFeedValidationDto
{
    public int ProductItemCount { get; set; }
    public int PromotionCount { get; set; }
    public int WarningCount { get; set; }
    public int ErrorCount { get; set; }
    public List<string> Warnings { get; set; } = [];
    public List<ProductFeedValidationIssueDto> Issues { get; set; } = [];
    public List<string> SampleProductIds { get; set; } = [];
    public List<ProductFeedValidationProductPreviewDto> ProductPreviews { get; set; } = [];
    public List<string> MissingRequestedProductIds { get; set; } = [];
}
