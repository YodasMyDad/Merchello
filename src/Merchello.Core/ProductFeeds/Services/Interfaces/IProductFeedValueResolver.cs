using Merchello.Core.ProductFeeds.Models;

namespace Merchello.Core.ProductFeeds.Services.Interfaces;

public interface IProductFeedValueResolver
{
    string Alias { get; }
    string Description { get; }

    Task<string?> ResolveAsync(
        ProductFeedResolverContext context,
        IReadOnlyDictionary<string, string> args,
        CancellationToken cancellationToken = default);
}