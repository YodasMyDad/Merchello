using Merchello.Core.ProductSync.Models;

namespace Merchello.Core.ProductSync.Dtos;

public class ValidateProductImportDto
{
    public ProductSyncProfile Profile { get; set; } = ProductSyncProfile.ShopifyStrict;
    public int? MaxIssues { get; set; }
}
