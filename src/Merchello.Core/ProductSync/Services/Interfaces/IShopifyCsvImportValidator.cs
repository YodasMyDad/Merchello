using Merchello.Core.ProductSync.Models;

namespace Merchello.Core.ProductSync.Services.Interfaces;

public interface IShopifyCsvImportValidator
{
    Task<ProductSyncValidationResult> ValidateAsync(
        ProductSyncCsvDocument document,
        ProductSyncProfile profile,
        int maxIssues,
        CancellationToken cancellationToken = default);
}
