using Merchello.Core.ProductSync.Models;

namespace Merchello.Core.ProductSync.Dtos;

public class StartProductExportDto
{
    public ProductSyncProfile Profile { get; set; } = ProductSyncProfile.ShopifyStrict;
}
