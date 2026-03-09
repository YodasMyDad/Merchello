using Merchello.Core.ProductFeeds.Models;
using Merchello.Core.ProductFeeds.Services.Interfaces;
using Merchello.Core.Protocols;
using Merchello.Core.Protocols.Interfaces;

namespace Merchello.Core.ProductFeeds.Services;

public class ProductFeedNativeCommerceResolver(ICommerceProtocolManager protocolManager)
    : IProductFeedValueResolver, IProductFeedResolverMetadata
{
    public string Alias => "native-commerce";
    public string Description => "Returns true when UCP protocol is enabled.";
    public string DisplayName => "Native Commerce (UCP)";
    public string? HelpText => "Automatically returns true when the UCP protocol adapter is enabled, enabling Google's Buy button on AI surfaces.";
    public bool SupportsArgs => false;
    public string? ArgsHelpText => null;
    public string? ArgsExampleJson => null;

    public async Task<string?> ResolveAsync(
        ProductFeedResolverContext context,
        IReadOnlyDictionary<string, string> args,
        CancellationToken cancellationToken = default)
    {
        await protocolManager.GetAdaptersAsync(cancellationToken);
        var isEnabled = protocolManager.IsProtocolSupported(ProtocolAliases.Ucp);
        return isEnabled ? "true" : null;
    }
}
