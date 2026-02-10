using System.Net;
using Merchello.Core.Caching.Services.Interfaces;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services;
using Merchello.Core.Products.Services.Parameters;
using Merchello.Core.Shared.Models;
using Merchello.Tests.TestInfrastructure;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Products;

public class GoogleShoppingCategoryServiceTests
{
    private readonly Mock<IHttpClientFactory> _httpClientFactoryMock = new();
    private readonly Mock<ICacheService> _cacheServiceMock = new();
    private readonly Mock<ILogger<GoogleShoppingCategoryService>> _loggerMock = new();
    private readonly MockHttpMessageHandler _httpMessageHandler = new();

    public GoogleShoppingCategoryServiceTests()
    {
        var httpClient = new HttpClient(_httpMessageHandler);
        _httpClientFactoryMock
            .Setup(x => x.CreateClient(It.IsAny<string>()))
            .Returns(httpClient);

        _cacheServiceMock
            .Setup(x => x.GetOrCreateAsync(
                It.IsAny<string>(),
                It.IsAny<Func<CancellationToken, Task<List<string>>>>(),
                It.IsAny<TimeSpan?>(),
                It.IsAny<IEnumerable<string>?>(),
                It.IsAny<CancellationToken>()))
            .Returns((string key, Func<CancellationToken, Task<List<string>>> factory, TimeSpan? ttl, IEnumerable<string>? tags, CancellationToken ct) =>
                factory(ct));
    }

    [Fact]
    public async Task GetCategoriesAsync_UsesStoreDefaultCountry_WhenCountryNotProvided()
    {
        _httpMessageHandler.ResponseStatusCode = HttpStatusCode.OK;
        _httpMessageHandler.ResponseContent = """
        # Google taxonomy
        Animals & Pet Supplies
        1000 - Animals & Pet Supplies > Pet Supplies
        Apparel & Accessories
        """;

        var service = CreateService(
            defaultShippingCountry: "GB",
            taxonomyUrls: new Dictionary<string, string>
            {
                ["GB"] = "https://www.google.com/basepages/producttype/taxonomy.en-GB.txt",
                ["US"] = "https://www.google.com/basepages/producttype/taxonomy.en-US.txt"
            });

        var result = await service.GetCategoriesAsync(new GetGoogleShoppingCategoriesParameters
        {
            Query = "Pet",
            Limit = 10
        });

        result.CountryCode.ShouldBe("GB");
        result.Categories.ShouldContain("Animals & Pet Supplies > Pet Supplies");
        _httpMessageHandler.ReceivedRequests.Count.ShouldBe(1);
        _httpMessageHandler.ReceivedRequests[0].RequestUri!.ToString()
            .ShouldBe("https://www.google.com/basepages/producttype/taxonomy.en-GB.txt");
        _cacheServiceMock.Verify(x => x.GetOrCreateAsync(
            $"{Merchello.Core.Constants.CacheKeys.GoogleShoppingTaxonomyPrefix}GB",
            It.IsAny<Func<CancellationToken, Task<List<string>>>>(),
            It.IsAny<TimeSpan?>(),
            It.IsAny<IEnumerable<string>?>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetCategoriesAsync_FallsBackToUs_WhenCountryMissingFromSettings()
    {
        _httpMessageHandler.Reset();
        _httpMessageHandler.ResponseStatusCode = HttpStatusCode.OK;
        _httpMessageHandler.ResponseContent = """
        Apparel & Accessories
        Apparel & Accessories > Shoes
        """;

        var service = CreateService(
            defaultShippingCountry: "FR",
            taxonomyUrls: new Dictionary<string, string>
            {
                ["US"] = "https://www.google.com/basepages/producttype/taxonomy.en-US.txt"
            });

        var result = await service.GetCategoriesAsync(new GetGoogleShoppingCategoriesParameters
        {
            Query = "Shoes",
            Limit = 10
        });

        result.CountryCode.ShouldBe("US");
        result.Categories.ShouldContain("Apparel & Accessories > Shoes");
        _httpMessageHandler.ReceivedRequests.Count.ShouldBe(1);
        _httpMessageHandler.ReceivedRequests[0].RequestUri!.ToString()
            .ShouldBe("https://www.google.com/basepages/producttype/taxonomy.en-US.txt");
        _cacheServiceMock.Verify(x => x.GetOrCreateAsync(
            $"{Merchello.Core.Constants.CacheKeys.GoogleShoppingTaxonomyPrefix}US",
            It.IsAny<Func<CancellationToken, Task<List<string>>>>(),
            It.IsAny<TimeSpan?>(),
            It.IsAny<IEnumerable<string>?>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    private GoogleShoppingCategoryService CreateService(string defaultShippingCountry, Dictionary<string, string> taxonomyUrls)
    {
        var categorySettings = Options.Create(new GoogleShoppingCategorySettings
        {
            FallbackCountryCode = "US",
            CacheHours = 24,
            TaxonomyUrls = taxonomyUrls
        });

        var merchelloSettings = Options.Create(new MerchelloSettings
        {
            DefaultShippingCountry = defaultShippingCountry
        });

        return new GoogleShoppingCategoryService(
            categorySettings,
            merchelloSettings,
            _cacheServiceMock.Object,
            _httpClientFactoryMock.Object,
            _loggerMock.Object);
    }
}
