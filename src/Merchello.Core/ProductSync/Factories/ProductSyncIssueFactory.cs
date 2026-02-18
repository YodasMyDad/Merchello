using Merchello.Core.ProductSync.Models;

namespace Merchello.Core.ProductSync.Factories;

public class ProductSyncIssueFactory
{
    public ProductSyncIssue Create(
        Guid runId,
        ProductSyncIssueSeverity severity,
        ProductSyncStage stage,
        string code,
        string message,
        int? rowNumber = null,
        string? handle = null,
        string? sku = null,
        string? field = null)
    {
        return new ProductSyncIssue
        {
            RunId = runId,
            Severity = severity,
            Stage = stage,
            Code = code,
            Message = message,
            RowNumber = rowNumber,
            Handle = handle,
            Sku = sku,
            Field = field,
            DateCreatedUtc = DateTime.UtcNow
        };
    }
}
