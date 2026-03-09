using Merchello.Core.ProductFeeds.Models;
using Merchello.Core.ProductFeeds.Services;
using Merchello.Core.Protocols.Interfaces;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.ProductFeeds;

public class ProductFeedNativeCommerceResolverTests
{
    [Fact]
    public async Task ResolveAsync_ReturnsTrue_WhenUcpIsEnabled()
    {
        var protocolManager = CreateProtocolManager(ucpSupported: true);

        var resolver = new ProductFeedNativeCommerceResolver(protocolManager.Object);
        var result = await resolver.ResolveAsync(CreateContext(), new Dictionary<string, string>());

        result.ShouldBe("true");
    }

    [Fact]
    public async Task ResolveAsync_ReturnsNull_WhenUcpIsNotEnabled()
    {
        var protocolManager = CreateProtocolManager(ucpSupported: false);

        var resolver = new ProductFeedNativeCommerceResolver(protocolManager.Object);
        var result = await resolver.ResolveAsync(CreateContext(), new Dictionary<string, string>());

        result.ShouldBeNull();
    }

    private static Mock<ICommerceProtocolManager> CreateProtocolManager(bool ucpSupported)
    {
        var mock = new Mock<ICommerceProtocolManager>();
        mock.Setup(x => x.GetAdaptersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        mock.Setup(x => x.IsProtocolSupported("ucp")).Returns(ucpSupported);
        return mock;
    }

    private static ProductFeedResolverContext CreateContext() =>
        new()
        {
            Product = new Core.Products.Models.Product { Id = Guid.NewGuid() },
            ProductRoot = new Core.Products.Models.ProductRoot { Id = Guid.NewGuid() },
            Feed = new ProductFeed { Id = Guid.NewGuid(), Name = "Test" }
        };
}
