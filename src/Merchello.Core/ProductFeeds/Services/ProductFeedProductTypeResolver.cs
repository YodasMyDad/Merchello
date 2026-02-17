using Merchello.Core.ProductFeeds.Models;
using Merchello.Core.ProductFeeds.Services.Interfaces;

namespace Merchello.Core.ProductFeeds.Services;

public class ProductFeedProductTypeResolver : IProductFeedValueResolver
{
    public string Alias => "product-type";
    public string Description => "Resolves the product type name.";

    public Task<string?> ResolveAsync(
        ProductFeedResolverContext context,
        IReadOnlyDictionary<string, string> args,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult<string?>(context.ProductRoot.ProductType?.Name);
    }
}