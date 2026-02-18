using Merchello.Core.ProductFeeds.Dtos;
using Merchello.Core.ProductFeeds.Models;
using Merchello.Core.Shared.Models;

namespace Merchello.Core.ProductFeeds.Services.Interfaces;

public interface IProductFeedService
{
    Task<List<ProductFeedListItemDto>> GetFeedsAsync(CancellationToken cancellationToken = default);
    Task<ProductFeedDetailDto?> GetFeedAsync(Guid id, CancellationToken cancellationToken = default);

    Task<CrudResult<ProductFeedDetailDto>> CreateFeedAsync(CreateProductFeedDto request, CancellationToken cancellationToken = default);
    Task<CrudResult<ProductFeedDetailDto>> UpdateFeedAsync(Guid id, UpdateProductFeedDto request, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> DeleteFeedAsync(Guid id, CancellationToken cancellationToken = default);

    Task<ProductFeedRebuildResultDto?> RebuildAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ProductFeedPreviewDto?> PreviewAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ProductFeedValidationDto?> ValidateAsync(Guid id, ValidateProductFeedDto request, CancellationToken cancellationToken = default);

    Task<string?> GetProductsXmlAsync(string slug, CancellationToken cancellationToken = default);
    Task<string?> GetPromotionsXmlAsync(string slug, CancellationToken cancellationToken = default);

    Task<List<ProductFeedResolverDescriptorDto>> GetResolversAsync(CancellationToken cancellationToken = default);
}
