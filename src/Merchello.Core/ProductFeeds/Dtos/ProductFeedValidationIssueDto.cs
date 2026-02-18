namespace Merchello.Core.ProductFeeds.Dtos;

public class ProductFeedValidationIssueDto
{
    public string Severity { get; set; } = "warning";
    public string Code { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? ProductId { get; set; }
    public string? ProductName { get; set; }
    public string? Field { get; set; }
}
