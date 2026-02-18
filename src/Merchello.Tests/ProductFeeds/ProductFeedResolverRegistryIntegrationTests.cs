using System.Reflection;
using Merchello.Core.Caching.Services.Interfaces;
using Merchello.Core.Data;
using Merchello.Core.ProductFeeds.Factories;
using Merchello.Core.ProductFeeds.Models;
using Merchello.Core.ProductFeeds.Services;
using Merchello.Core.ProductFeeds.Services.Interfaces;
using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Reflection;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Tests.TestInfrastructure;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Shouldly;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace Merchello.Tests.ProductFeeds;

[Collection("Integration Tests")]
public class ProductFeedResolverRegistryIntegrationTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;

    public ProductFeedResolverRegistryIntegrationTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _fixture.ResetMocks();
    }

    [Fact]
    public async Task GetResolversAsync_RealRegistry_MapsMetadataAndLegacyFallback()
    {
        var originalAssemblies = AssemblyManager.Assemblies.ToArray();

        try
        {
            AssemblyManager.SetAssemblies(
                originalAssemblies
                    .Concat([typeof(ProductFeedResolverRegistryIntegrationTests).Assembly])
                    .Where(a => a != null)
                    .Distinct()
                    .ToArray());

            var resolverRegistry = CreateRegistry();
            var service = CreateService(resolverRegistry);

            var descriptors = await service.GetResolversAsync();

            descriptors.ShouldContain(x =>
                x.Alias == "integration-metadata" &&
                x.DisplayName == "Integration Metadata Resolver" &&
                x.HelpText == "Resolver used by integration tests." &&
                x.SupportsArgs &&
                x.ArgsHelpText == "Use {\"prefix\":\"VIP\"}." &&
                x.ArgsExampleJson == "{\"prefix\":\"VIP\"}");

            descriptors.ShouldContain(x =>
                x.Alias == "integration-legacy" &&
                x.DisplayName == "integration-legacy" &&
                x.HelpText == null &&
                !x.SupportsArgs &&
                x.ArgsHelpText == null &&
                x.ArgsExampleJson == null);
        }
        finally
        {
            AssemblyManager.SetAssemblies(originalAssemblies);
        }
    }

    [Fact]
    public async Task GetResolver_RealRegistry_InstantiatesResolverWithDiDependency()
    {
        var originalAssemblies = AssemblyManager.Assemblies.ToArray();

        try
        {
            AssemblyManager.SetAssemblies(
                originalAssemblies
                    .Concat([typeof(ProductFeedResolverRegistryIntegrationTests).Assembly])
                    .Where(a => a != null)
                    .Distinct()
                    .ToArray());

            var resolverRegistry = CreateRegistry();

            var resolver = resolverRegistry.GetResolver("integration-metadata");
            resolver.ShouldNotBeNull();

            var productRoot = new ProductRoot
            {
                Id = Guid.NewGuid(),
                RootName = "Resolver Product Root"
            };

            var product = new Product
            {
                Id = Guid.NewGuid(),
                Name = "Resolver Product",
                ProductRoot = productRoot,
                ProductRootId = productRoot.Id
            };

            var value = await resolver!.ResolveAsync(
                new ProductFeedResolverContext
                {
                    Product = product,
                    ProductRoot = productRoot,
                    Feed = new ProductFeed
                    {
                        Id = Guid.NewGuid(),
                        Name = "Resolver Feed",
                        Slug = "resolver-feed",
                        IsEnabled = true,
                        CountryCode = "US",
                        CurrencyCode = "USD",
                        LanguageCode = "en"
                    }
                },
                new Dictionary<string, string>
                {
                    ["prefix"] = "VIP"
                });

            value.ShouldBe("VIP|100.00");
        }
        finally
        {
            AssemblyManager.SetAssemblies(originalAssemblies);
        }
    }

    private ProductFeedResolverRegistry CreateRegistry()
    {
        return new ProductFeedResolverRegistry(
            _fixture.GetService<ExtensionManager>(),
            _fixture.ServiceProvider);
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
}

public class IntegrationMetadataResolver(ICurrencyService currencyService) : IProductFeedValueResolver, IProductFeedResolverMetadata
{
    public string Alias => "integration-metadata";
    public string Description => "Resolver with metadata and DI dependency.";
    public string DisplayName => "Integration Metadata Resolver";
    public string? HelpText => "Resolver used by integration tests.";
    public bool SupportsArgs => true;
    public string? ArgsHelpText => "Use {\"prefix\":\"VIP\"}.";
    public string? ArgsExampleJson => "{\"prefix\":\"VIP\"}";

    public Task<string?> ResolveAsync(
        ProductFeedResolverContext context,
        IReadOnlyDictionary<string, string> args,
        CancellationToken cancellationToken = default)
    {
        args.TryGetValue("prefix", out var prefix);
        var rounded = currencyService.Round(100m, context.Feed.CurrencyCode);
        return Task.FromResult<string?>($"{prefix}|{rounded:0.00}");
    }
}

public class IntegrationLegacyResolver : IProductFeedValueResolver
{
    public string Alias => "integration-legacy";
    public string Description => "Resolver without metadata contract.";

    public Task<string?> ResolveAsync(
        ProductFeedResolverContext context,
        IReadOnlyDictionary<string, string> args,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult<string?>("legacy");
    }
}
