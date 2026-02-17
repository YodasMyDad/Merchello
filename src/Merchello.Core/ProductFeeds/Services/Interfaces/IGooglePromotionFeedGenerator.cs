using Merchello.Core.ProductFeeds.Models;

namespace Merchello.Core.ProductFeeds.Services.Interfaces;

public interface IGooglePromotionFeedGenerator
{
    Task<ProductPromotionFeedGenerationResult> GenerateAsync(
        ProductFeed feed,
        ProductFeedGenerationResult productFeedResult,
        CancellationToken cancellationToken = default);
}