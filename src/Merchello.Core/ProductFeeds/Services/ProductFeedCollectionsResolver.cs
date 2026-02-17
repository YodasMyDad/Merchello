using Merchello.Core.ProductFeeds.Models;
using Merchello.Core.ProductFeeds.Services.Interfaces;

namespace Merchello.Core.ProductFeeds.Services;

public class ProductFeedCollectionsResolver : IProductFeedValueResolver
{
    public string Alias => "collections";
    public string Description => "Comma-separated product collection names.";

    public Task<string?> ResolveAsync(
        ProductFeedResolverContext context,
        IReadOnlyDictionary<string, string> args,
        CancellationToken cancellationToken = default)
    {
        var names = context.ProductRoot.Collections
            .Select(c => c.Name)
            .Where(n => !string.IsNullOrWhiteSpace(n))
            .Cast<string>()
            .OrderBy(n => n)
            .ToList();

        return Task.FromResult<string?>(names.Count == 0 ? null : string.Join(", ", names));
    }
}