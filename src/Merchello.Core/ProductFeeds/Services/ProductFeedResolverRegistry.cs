using Merchello.Core.ProductFeeds.Services.Interfaces;
using Merchello.Core.Shared.Reflection;

namespace Merchello.Core.ProductFeeds.Services;

public class ProductFeedResolverRegistry(
    ExtensionManager extensionManager,
    IServiceProvider serviceProvider) : IProductFeedResolverRegistry
{
    public IReadOnlyCollection<IProductFeedValueResolver> GetResolvers()
    {
        var resolvers = extensionManager.GetInstances<IProductFeedValueResolver>(
                predicate: null,
                useCaching: true,
                serviceProvider: serviceProvider)
            .Where(r => r != null)
            .Cast<IProductFeedValueResolver>()
            .GroupBy(r => r.Alias, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.First())
            .OrderBy(r => r.Alias)
            .ToList();

        return resolvers;
    }

    public IProductFeedValueResolver? GetResolver(string alias)
    {
        if (string.IsNullOrWhiteSpace(alias))
        {
            return null;
        }

        return GetResolvers().FirstOrDefault(r =>
            string.Equals(r.Alias, alias.Trim(), StringComparison.OrdinalIgnoreCase));
    }
}
