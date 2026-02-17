using Merchello.Core.Caching.Services.Interfaces;
using Merchello.Core.Data;
using Merchello.Core.ProductFeeds.Factories;
using Merchello.Core.ProductFeeds.Services;
using Merchello.Core.ProductFeeds.Services.Interfaces;
using Merchello.Core.Shared.Extensions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Shouldly;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace Merchello.Tests.ProductFeeds;

public class ProductFeedResolverDescriptorTests
{
    [Fact]
    public async Task GetResolversAsync_MapsMetadata_WhenResolverImplementsMetadataContract()
    {
        var resolverRegistryMock = new Mock<IProductFeedResolverRegistry>();
        resolverRegistryMock
            .Setup(x => x.GetResolvers())
            .Returns(
            [
                new MetadataResolver(),
                new LegacyResolver()
            ]);

        var service = CreateService(resolverRegistryMock.Object);

        var descriptors = await service.GetResolversAsync();

        descriptors.Count.ShouldBe(2);

        var metadataDescriptor = descriptors.Single(x => x.Alias == "with-metadata");
        metadataDescriptor.DisplayName.ShouldBe("Resolver With Metadata");
        metadataDescriptor.HelpText.ShouldBe("Resolves a value with metadata.");
        metadataDescriptor.SupportsArgs.ShouldBeTrue();
        metadataDescriptor.ArgsHelpText.ShouldBe("Use {\"mode\":\"full\"}.");
        metadataDescriptor.ArgsExampleJson.ShouldBe("{\"mode\":\"full\"}");

        var legacyDescriptor = descriptors.Single(x => x.Alias == "legacy");
        legacyDescriptor.DisplayName.ShouldBe("legacy");
        legacyDescriptor.HelpText.ShouldBeNull();
        legacyDescriptor.SupportsArgs.ShouldBeFalse();
        legacyDescriptor.ArgsHelpText.ShouldBeNull();
        legacyDescriptor.ArgsExampleJson.ShouldBeNull();
    }

    private static ProductFeedService CreateService(IProductFeedResolverRegistry resolverRegistry)
    {
        var scopeProviderMock = new Mock<IEFCoreScopeProvider<MerchelloDbContext>>();
        var productGeneratorMock = new Mock<IGoogleProductFeedGenerator>();
        var promotionGeneratorMock = new Mock<IGooglePromotionFeedGenerator>();
        var cacheServiceMock = new Mock<ICacheService>();

        return new ProductFeedService(
            scopeProviderMock.Object,
            new ProductFeedFactory(),
            new SlugHelper(),
            productGeneratorMock.Object,
            promotionGeneratorMock.Object,
            resolverRegistry,
            cacheServiceMock.Object,
            NullLogger<ProductFeedService>.Instance);
    }

    private class MetadataResolver : IProductFeedValueResolver, IProductFeedResolverMetadata
    {
        public string Alias => "with-metadata";
        public string Description => "Resolver with metadata contract.";
        public string DisplayName => "Resolver With Metadata";
        public string? HelpText => "Resolves a value with metadata.";
        public bool SupportsArgs => true;
        public string? ArgsHelpText => "Use {\"mode\":\"full\"}.";
        public string? ArgsExampleJson => "{\"mode\":\"full\"}";

        public Task<string?> ResolveAsync(
            Core.ProductFeeds.Models.ProductFeedResolverContext context,
            IReadOnlyDictionary<string, string> args,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult<string?>("value");
        }
    }

    private class LegacyResolver : IProductFeedValueResolver
    {
        public string Alias => "legacy";
        public string Description => "Resolver without metadata contract.";

        public Task<string?> ResolveAsync(
            Core.ProductFeeds.Models.ProductFeedResolverContext context,
            IReadOnlyDictionary<string, string> args,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult<string?>("legacy");
        }
    }
}
