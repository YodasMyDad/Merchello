using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.ProductSync.Models;

public class ProductSyncIssue
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;
    public Guid RunId { get; set; }
    public virtual ProductSyncRun? Run { get; set; }

    public ProductSyncIssueSeverity Severity { get; set; }
    public ProductSyncStage Stage { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;

    public int? RowNumber { get; set; }
    public string? Handle { get; set; }
    public string? Sku { get; set; }
    public string? Field { get; set; }
    public DateTime DateCreatedUtc { get; set; } = DateTime.UtcNow;
}
