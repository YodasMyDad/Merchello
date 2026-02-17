using Merchello.Core.ProductFeeds.Models;

namespace Merchello.Core.ProductFeeds.Services.Interfaces;

public interface IGoogleProductFeedGenerator
{
    Task<ProductFeedGenerationResult> GenerateAsync(ProductFeed feed, CancellationToken cancellationToken = default);
}