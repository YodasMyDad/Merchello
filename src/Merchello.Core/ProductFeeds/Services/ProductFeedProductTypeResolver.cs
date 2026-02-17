using Merchello.Core.ProductFeeds.Models;
using Merchello.Core.ProductFeeds.Services.Interfaces;

namespace Merchello.Core.ProductFeeds.Services;

public class ProductFeedProductTypeResolver : IProductFeedValueResolver, IProductFeedResolverMetadata
{
    public string Alias => "product-type";
    public string Description => "Resolves the product type name.";
    public string DisplayName => "Product Type";
    public string? HelpText => "Resolves the product type name from the product root.";
    public bool SupportsArgs => false;
    public string? ArgsHelpText => null;
    public string? ArgsExampleJson => null;

    public Task<string?> ResolveAsync(
        ProductFeedResolverContext context,
        IReadOnlyDictionary<string, string> args,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult<string?>(context.ProductRoot.ProductType?.Name);
    }
}
