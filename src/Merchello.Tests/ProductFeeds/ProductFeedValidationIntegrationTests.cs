using Merchello.Core;
using Merchello.Core.ProductFeeds.Dtos;
using Merchello.Core.ProductFeeds.Factories;
using Merchello.Core.ProductFeeds.Models;
using Merchello.Core.ProductFeeds.Services;
using Merchello.Core.ProductFeeds.Services.Interfaces;
using Merchello.Core.Data;
using Merchello.Core.Shared.Extensions;
using Merchello.Tests.TestInfrastructure;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Shouldly;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace Merchello.Tests.ProductFeeds;

[Collection("Integration Tests")]
public class ProductFeedValidationIntegrationTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;

    public ProductFeedValidationIntegrationTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _fixture.ResetMocks();
    }

    [Fact]
    public async Task ValidateAsync_MissingImageLink_ReturnsMissingRequiredFieldIssue()
    {
        var feed = await CreateFeedAsync(countryCode: "US", includeTaxInPrice: false);
        var productId = Guid.NewGuid();

        var service = CreateService(
            productResult: new ProductFeedGenerationResult
            {
                Xml = BuildFeedXml(
                    BuildItemXml(
                        productId,
                        includeImageLink: false)),
                ItemCount = 1,
                Items =
                [
                    new ProductFeedGeneratedItem
                    {
                        ProductId = productId
                    }
                ]
            });

        var result = await service.ValidateAsync(feed.Id, new ValidateProductFeedDto());

        result.ShouldNotBeNull();
        result!.Issues.ShouldContain(x =>
            x.Code == "missing_required_field" &&
            x.Field == "image_link" &&
            x.Severity == "error");
    }

    [Fact]
    public async Task ValidateAsync_RequestedPreviewProductIds_ReturnsPreviewForExistingProduct()
    {
        var feed = await CreateFeedAsync(countryCode: "US", includeTaxInPrice: false);
        var productId = Guid.NewGuid();

        var service = CreateService(
            productResult: new ProductFeedGenerationResult
            {
                Xml = BuildFeedXml(
                    BuildItemXml(
                        productId,
                        includeImageLink: true,
                        title: "Preview Product",
                        price: "15.00 USD")),
                ItemCount = 1,
                Items =
                [
                    new ProductFeedGeneratedItem
                    {
                        ProductId = productId
                    }
                ]
            });

        var result = await service.ValidateAsync(feed.Id, new ValidateProductFeedDto
        {
            PreviewProductIds = [productId]
        });

        result.ShouldNotBeNull();
        result!.ProductPreviews.Count.ShouldBe(1);
        result.ProductPreviews[0].ProductId.ShouldBe(productId.ToString());
        result.ProductPreviews[0].Title.ShouldBe("Preview Product");
        result.ProductPreviews[0].Price.ShouldBe("15.00 USD");
    }

    [Fact]
    public async Task ValidateAsync_UnknownRequestedPreviewProductIds_ReturnsMissingIds()
    {
        var feed = await CreateFeedAsync(countryCode: "US", includeTaxInPrice: false);
        var knownProductId = Guid.NewGuid();
        var unknownProductId = Guid.NewGuid();

        var service = CreateService(
            productResult: new ProductFeedGenerationResult
            {
                Xml = BuildFeedXml(
                    BuildItemXml(
                        knownProductId,
                        includeImageLink: true)),
                ItemCount = 1,
                Items =
                [
                    new ProductFeedGeneratedItem
                    {
                        ProductId = knownProductId
                    }
                ]
            });

        var result = await service.ValidateAsync(feed.Id, new ValidateProductFeedDto
        {
            PreviewProductIds = [unknownProductId]
        });

        result.ShouldNotBeNull();
        result!.ProductPreviews.ShouldBeEmpty();
        result.MissingRequestedProductIds.ShouldContain(unknownProductId.ToString());
    }

    [Fact]
    public async Task ValidateAsync_GeneratorWarnings_IncludesWarningsInValidationResponse()
    {
        var feed = await CreateFeedAsync(countryCode: "US", includeTaxInPrice: false);
        var productId = Guid.NewGuid();

        var service = CreateService(
            productResult: new ProductFeedGenerationResult
            {
                Xml = BuildFeedXml(
                    BuildItemXml(
                        productId,
                        includeImageLink: true)),
                ItemCount = 1,
                Warnings = ["Product warning"],
                Items =
                [
                    new ProductFeedGeneratedItem
                    {
                        ProductId = productId
                    }
                ]
            },
            promotionResult: new ProductPromotionFeedGenerationResult
            {
                Xml = "<rss version=\"2.0\"><channel></channel></rss>",
                PromotionCount = 0,
                Warnings = ["Promotion warning"]
            });

        var result = await service.ValidateAsync(feed.Id, new ValidateProductFeedDto());

        result.ShouldNotBeNull();
        result!.Warnings.ShouldContain("Product warning");
        result.Warnings.ShouldContain("Promotion warning");
        result.WarningCount.ShouldBeGreaterThanOrEqualTo(2);
    }

    [Fact]
    public async Task ValidateAsync_CountryTaxModeMismatch_AddsFeedLevelWarning()
    {
        var feed = await CreateFeedAsync(countryCode: "US", includeTaxInPrice: true);
        var productId = Guid.NewGuid();

        var service = CreateService(
            productResult: new ProductFeedGenerationResult
            {
                Xml = BuildFeedXml(
                    BuildItemXml(
                        productId,
                        includeImageLink: true)),
                ItemCount = 1,
                Items =
                [
                    new ProductFeedGeneratedItem
                    {
                        ProductId = productId
                    }
                ]
            });

        var result = await service.ValidateAsync(feed.Id, new ValidateProductFeedDto());

        result.ShouldNotBeNull();
        result!.Warnings.ShouldContain(x =>
            x.Contains("Tax mode differs from Google default for US", StringComparison.Ordinal));
    }

    private ProductFeedService CreateService(
        ProductFeedGenerationResult productResult,
        ProductPromotionFeedGenerationResult? promotionResult = null)
    {
        var productGeneratorMock = new Mock<IGoogleProductFeedGenerator>();
        productGeneratorMock
            .Setup(x => x.GenerateAsync(It.IsAny<ProductFeed>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(productResult);

        var promotionGeneratorMock = new Mock<IGooglePromotionFeedGenerator>();
        promotionGeneratorMock
            .Setup(x => x.GenerateAsync(It.IsAny<ProductFeed>(), It.IsAny<ProductFeedGenerationResult>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(promotionResult ?? new ProductPromotionFeedGenerationResult
            {
                Xml = "<rss version=\"2.0\"><channel></channel></rss>",
                PromotionCount = 0,
                Warnings = []
            });

        var resolverRegistryMock = new Mock<IProductFeedResolverRegistry>();
        resolverRegistryMock
            .Setup(x => x.GetResolvers())
            .Returns([]);
        resolverRegistryMock
            .Setup(x => x.GetResolver(It.IsAny<string>()))
            .Returns((IProductFeedValueResolver?)null);

        return new ProductFeedService(
            _fixture.GetService<IEFCoreScopeProvider<MerchelloDbContext>>(),
            new ProductFeedFactory(),
            new SlugHelper(),
            productGeneratorMock.Object,
            promotionGeneratorMock.Object,
            resolverRegistryMock.Object,
            _fixture.CacheServiceMock.Object,
            NullLogger<ProductFeedService>.Instance);
    }

    private async Task<ProductFeed> CreateFeedAsync(string countryCode, bool? includeTaxInPrice)
    {
        var feed = new ProductFeed
        {
            Id = Guid.NewGuid(),
            Name = "Validation Feed",
            Slug = $"validation-feed-{Guid.NewGuid():N}",
            IsEnabled = true,
            CountryCode = countryCode,
            CurrencyCode = "USD",
            LanguageCode = "en",
            IncludeTaxInPrice = includeTaxInPrice
        };

        _fixture.DbContext.ProductFeeds.Add(feed);
        await _fixture.DbContext.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();
        return feed;
    }

    private static string BuildFeedXml(string itemXml)
    {
        return
            """
            <rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
              <channel>
            """
            + itemXml +
            """
              </channel>
            </rss>
            """;
    }

    private static string BuildItemXml(
        Guid productId,
        bool includeImageLink,
        string title = "Test Product",
        string price = "10.00 USD")
    {
        var imageElement = includeImageLink
            ? "<g:image_link>https://example.com/images/test.jpg</g:image_link>"
            : string.Empty;

        return
            $"""
             <item>
               <g:id>{productId}</g:id>
               <g:title>{title}</g:title>
               <g:description>Test description</g:description>
               <g:link>https://example.com/products/test</g:link>
               {imageElement}
               <g:availability>in_stock</g:availability>
               <g:price>{price}</g:price>
             </item>
             """;
    }
}
