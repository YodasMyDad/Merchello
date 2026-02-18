namespace Merchello.Core.ProductFeeds.Services.Interfaces;

public interface IProductFeedMediaUrlResolver
{
    string? ResolveMediaUrl(string? imageReference);
}