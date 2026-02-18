namespace Merchello.Core.ProductSync.Models;

public class ProductSyncValidationResult
{
    public int RowCount { get; set; }
    public int DistinctHandleCount { get; set; }
    public List<ProductSyncIssue> Issues { get; set; } = [];
}
