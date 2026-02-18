using Merchello.Core.ProductSync.Models;

namespace Merchello.Core.ProductSync.Dtos;

public class ProductSyncIssueDto
{
    public Guid Id { get; set; }
    public Guid RunId { get; set; }
    public ProductSyncIssueSeverity Severity { get; set; }
    public ProductSyncStage Stage { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public int? RowNumber { get; set; }
    public string? Handle { get; set; }
    public string? Sku { get; set; }
    public string? Field { get; set; }
    public DateTime DateCreatedUtc { get; set; }
}
