using Merchello.Core.ProductSync.Models;

namespace Merchello.Core.ProductSync.Dtos;

public class StartProductImportDto
{
    public ProductSyncProfile Profile { get; set; } = ProductSyncProfile.ShopifyStrict;
    public bool ContinueOnImageFailure { get; set; }
    public int? MaxIssues { get; set; }
}
