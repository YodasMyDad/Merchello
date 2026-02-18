namespace Merchello.Core.ProductSync.Dtos;

public class ProductImportValidationDto
{
    public bool IsValid { get; set; }
    public int RowCount { get; set; }
    public int DistinctHandleCount { get; set; }
    public int WarningCount { get; set; }
    public int ErrorCount { get; set; }
    public List<ProductSyncIssueDto> Issues { get; set; } = [];
}
