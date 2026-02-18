using Merchello.Core.ProductFeeds.Models;
using Merchello.Core.ProductFeeds.Services.Interfaces;

namespace Merchello.Core.ProductFeeds.Services;

public class ProductFeedSupplierResolver : IProductFeedValueResolver, IProductFeedResolverMetadata
{
    public string Alias => "supplier";
    public string Description => "Supplier name based on warehouse priority.";
    public string DisplayName => "Supplier Name";
    public string? HelpText => "Resolves the prioritized warehouse supplier name for this product.";
    public bool SupportsArgs => false;
    public string? ArgsHelpText => null;
    public string? ArgsExampleJson => null;

    public Task<string?> ResolveAsync(
        ProductFeedResolverContext context,
        IReadOnlyDictionary<string, string> args,
        CancellationToken cancellationToken = default)
    {
        var prioritizedSupplier = context.ProductRoot.ProductRootWarehouses
            .OrderBy(w => w.PriorityOrder)
            .Select(w => w.Warehouse?.Supplier?.Name)
            .FirstOrDefault(n => !string.IsNullOrWhiteSpace(n));

        if (!string.IsNullOrWhiteSpace(prioritizedSupplier))
        {
            return Task.FromResult<string?>(prioritizedSupplier);
        }

        var firstSupplier = context.ProductRoot.ProductRootWarehouses
            .Select(w => w.Warehouse?.Supplier?.Name)
            .FirstOrDefault(n => !string.IsNullOrWhiteSpace(n));

        return Task.FromResult<string?>(firstSupplier);
    }
}
