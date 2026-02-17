namespace Merchello.Core.ProductFeeds.Services.Interfaces;

public interface IProductFeedResolverRegistry
{
    IReadOnlyCollection<IProductFeedValueResolver> GetResolvers();
    IProductFeedValueResolver? GetResolver(string alias);
}