namespace Merchello.Core.ProductSync.Models;

public class ProductSyncCsvDocument
{
    public List<string> Headers { get; set; } = [];
    public List<ProductSyncCsvRow> Rows { get; set; } = [];
}
