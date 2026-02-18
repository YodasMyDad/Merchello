namespace Merchello.Core.ProductFeeds.Dtos;

public class ProductFeedRebuildResultDto
{
    public bool Success { get; set; }
    public DateTime GeneratedAtUtc { get; set; }
    public int ProductItemCount { get; set; }
    public int PromotionCount { get; set; }
    public int WarningCount { get; set; }
    public List<string> Warnings { get; set; } = [];
    public string? Error { get; set; }
}