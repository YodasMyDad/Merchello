using Merchello.Core.ProductFeeds.Models;
using Merchello.Core.ProductFeeds.Services.Interfaces;

namespace Merchello.Core.ProductFeeds.Services;

public class ProductFeedStockStatusResolver : IProductFeedValueResolver, IProductFeedResolverMetadata
{
    public string Alias => "stock-status";
    public string Description => "Returns in_stock or out_of_stock based on purchasability and stock.";
    public string DisplayName => "Stock Status";
    public string? HelpText => "Returns Google-compatible stock status based on purchasability and tracked inventory.";
    public bool SupportsArgs => false;
    public string? ArgsHelpText => null;
    public string? ArgsExampleJson => null;

    public Task<string?> ResolveAsync(
        ProductFeedResolverContext context,
        IReadOnlyDictionary<string, string> args,
        CancellationToken cancellationToken = default)
    {
        if (!context.Product.CanPurchase || !context.Product.AvailableForPurchase)
        {
            return Task.FromResult<string?>("out_of_stock");
        }

        var tracked = context.Product.ProductWarehouses.Where(x => x.TrackStock).ToList();
        if (tracked.Count == 0)
        {
            return Task.FromResult<string?>("in_stock");
        }

        var hasStock = tracked.Any(x => (x.Stock - x.ReservedStock) > 0);
        return Task.FromResult<string?>(hasStock ? "in_stock" : "out_of_stock");
    }
}
