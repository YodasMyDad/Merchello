using Merchello.Core.ProductFeeds.Models;
using Merchello.Core.ProductFeeds.Services.Interfaces;

namespace Merchello.Core.ProductFeeds.Services;

public class ProductFeedOnSaleResolver : IProductFeedValueResolver, IProductFeedResolverMetadata
{
    public string Alias => "on-sale";
    public string Description => "Returns true when sale pricing is active.";
    public string DisplayName => "On Sale";
    public string? HelpText => "Returns true when a valid sale price is currently active for the product.";
    public bool SupportsArgs => false;
    public string? ArgsHelpText => null;
    public string? ArgsExampleJson => null;

    public Task<string?> ResolveAsync(
        ProductFeedResolverContext context,
        IReadOnlyDictionary<string, string> args,
        CancellationToken cancellationToken = default)
    {
        var onSale = context.Product.OnSale &&
                     context.Product.PreviousPrice.HasValue &&
                     context.Product.PreviousPrice.Value > context.Product.Price;

        return Task.FromResult<string?>(onSale ? "true" : "false");
    }
}
