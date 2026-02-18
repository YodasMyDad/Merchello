using Merchello.Core.ProductSync.Models;

namespace Merchello.Core.ProductSync.Services.Interfaces;

public interface IShopifyCsvMapper
{
    Task<ProductSyncCsvDocument> ParseAsync(
        Stream csvStream,
        ProductSyncProfile profile,
        CancellationToken cancellationToken = default);

    Task WriteAsync(
        Stream destinationStream,
        ProductSyncProfile profile,
        IReadOnlyList<ProductSyncCsvRow> rows,
        CancellationToken cancellationToken = default);
}
