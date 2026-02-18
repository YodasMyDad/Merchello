using System.Xml.Linq;
using Merchello.Core;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Data;
using Merchello.Core.ExchangeRates.Services.Interfaces;
using Merchello.Core.ProductFeeds.Models;
using Merchello.Core.ProductFeeds.Services;
using Merchello.Core.ProductFeeds.Services.Interfaces;
using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Shipping.Providers.Interfaces;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Warehouses.Models;
using Merchello.Tests.TestInfrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Shouldly;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace Merchello.Tests.ProductFeeds;

[Collection("Integration Tests")]
public class GoogleProductFeedGeneratorIntegrationTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IEFCoreScopeProvider<MerchelloDbContext> _scopeProvider;
    private readonly IExchangeRateCache _exchangeRateCache;
    private readonly IShippingOptionEligibilityService _shippingOptionEligibilityService;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ICurrencyService _currencyService;
    private readonly IOptions<MerchelloSettings> _settings;

    public GoogleProductFeedGeneratorIntegrationTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _fixture.ResetMocks();

        _scopeProvider = fixture.GetService<IEFCoreScopeProvider<MerchelloDbContext>>();
        _exchangeRateCache = fixture.GetService<IExchangeRateCache>();
        _shippingOptionEligibilityService = fixture.GetService<IShippingOptionEligibilityService>();
        _httpContextAccessor = fixture.GetService<IHttpContextAccessor>();
        _currencyService = fixture.GetService<ICurrencyService>();
        _settings = fixture.GetService<IOptions<MerchelloSettings>>();
    }

    [Fact]
    public async Task GenerateAsync_IncludeTaxInPriceTrueForUs_UsesTaxInclusivePriceAndCallsTaxRateLookup()
    {
        var taxServiceMock = new Mock<ITaxService>();
        taxServiceMock
            .Setup(x => x.GetApplicableRateAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(20m);

        var generator = CreateGenerator(taxServiceMock);
        var (_, feed) = await SeedProductScenarioAsync(
            countryCode: "US",
            includeTaxInPrice: true);

        var result = await generator.GenerateAsync(feed);
        var item = GetSingleItem(result.Xml);
        var price = GetGoogleElementValue(item, "price");

        price.ShouldBe("120.00 USD");
        taxServiceMock.Verify(
            x => x.GetApplicableRateAsync(It.IsAny<Guid>(), "US", null, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task GenerateAsync_IncludeTaxInPriceFalseForGb_UsesTaxExclusivePrice()
    {
        var taxServiceMock = new Mock<ITaxService>();
        taxServiceMock
            .Setup(x => x.GetApplicableRateAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(20m);

        var generator = CreateGenerator(taxServiceMock);
        var (_, feed) = await SeedProductScenarioAsync(
            countryCode: "GB",
            includeTaxInPrice: false);

        var result = await generator.GenerateAsync(feed);
        var item = GetSingleItem(result.Xml);
        var price = GetGoogleElementValue(item, "price");

        price.ShouldBe("100.00 USD");
        taxServiceMock.Verify(
            x => x.GetApplicableRateAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task GenerateAsync_NullIncludeTaxInPrice_FallsBackToCountryDefault()
    {
        var taxServiceMock = new Mock<ITaxService>();
        taxServiceMock
            .Setup(x => x.GetApplicableRateAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(20m);

        var generator = CreateGenerator(taxServiceMock);
        var (_, usFeed) = await SeedProductScenarioAsync(
            countryCode: "US",
            includeTaxInPrice: null);

        var usResult = await generator.GenerateAsync(usFeed);
        var usPrice = GetGoogleElementValue(GetSingleItem(usResult.Xml), "price");
        usPrice.ShouldBe("100.00 USD");
        taxServiceMock.Verify(
            x => x.GetApplicableRateAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()),
            Times.Never);

        taxServiceMock.Invocations.Clear();

        var gbFeed = new ProductFeed
        {
            Id = Guid.NewGuid(),
            Name = "GB Feed",
            Slug = "gb-feed",
            IsEnabled = true,
            CountryCode = "GB",
            CurrencyCode = "USD",
            LanguageCode = "en",
            IncludeTaxInPrice = null
        };

        var gbResult = await generator.GenerateAsync(gbFeed);
        var gbPrice = GetGoogleElementValue(GetSingleItem(gbResult.Xml), "price");
        gbPrice.ShouldBe("120.00 USD");
        taxServiceMock.Verify(
            x => x.GetApplicableRateAsync(It.IsAny<Guid>(), "GB", null, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task GenerateAsync_DynamicLiveRateOption_EmitsShippingLabel()
    {
        var taxServiceMock = new Mock<ITaxService>();
        taxServiceMock
            .Setup(x => x.GetApplicableRateAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(20m);

        var shippingProviderManagerMock = new Mock<IShippingProviderManager>();
        shippingProviderManagerMock
            .Setup(x => x.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(
            [
                CreateRegisteredProvider("fedex", "FedEx", usesLiveRates: true)
            ]);

        var generator = CreateGenerator(taxServiceMock, shippingProviderManagerMock);
        var (_, feed) = await SeedProductScenarioAsync(
            countryCode: "US",
            includeTaxInPrice: false,
            addShippingOptions: (builder, warehouse) =>
            {
                var option = builder.CreateShippingOption("FedEx Ground", warehouse, fixedCost: 5m);
                option.ProviderKey = "fedex";
                option.ServiceType = "FEDEX_GROUND";
                option.FixedCost = null;
            });

        var result = await generator.GenerateAsync(feed);
        var item = GetSingleItem(result.Xml);
        var shippingLabel = GetGoogleElementValue(item, "shipping_label");

        shippingLabel.ShouldBe("FedEx Ground");
    }

    [Fact]
    public async Task GenerateAsync_AllowExternalCarrierShippingFalse_ExcludesDynamicProviderLabel()
    {
        var taxServiceMock = new Mock<ITaxService>();
        taxServiceMock
            .Setup(x => x.GetApplicableRateAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(20m);

        var shippingProviderManagerMock = new Mock<IShippingProviderManager>();
        shippingProviderManagerMock
            .Setup(x => x.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(
            [
                CreateRegisteredProvider("fedex", "FedEx", usesLiveRates: true)
            ]);

        var generator = CreateGenerator(taxServiceMock, shippingProviderManagerMock);
        var (_, feed) = await SeedProductScenarioAsync(
            countryCode: "US",
            includeTaxInPrice: false,
            allowExternalCarrierShipping: false,
            addShippingOptions: (builder, warehouse) =>
            {
                var option = builder.CreateShippingOption("FedEx Ground", warehouse, fixedCost: 5m);
                option.ProviderKey = "fedex";
                option.ServiceType = "FEDEX_GROUND";
                option.FixedCost = null;
            });

        var result = await generator.GenerateAsync(feed);
        var item = GetSingleItem(result.Xml);
        var shippingLabel = GetGoogleElementValue(item, "shipping_label");

        shippingLabel.ShouldBeNull();
    }

    [Fact]
    public async Task GenerateAsync_MultiVariantRootWithSingleEmittedVariant_StillEmitsItemGroupId()
    {
        var taxServiceMock = new Mock<ITaxService>();
        taxServiceMock
            .Setup(x => x.GetApplicableRateAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(20m);

        var generator = CreateGenerator(taxServiceMock);
        var dataBuilder = _fixture.CreateDataBuilder();

        var taxGroup = dataBuilder.CreateTaxGroup("Standard", 20m);
        var warehouse = dataBuilder.CreateWarehouse("Main Warehouse", "US");
        warehouse.SetServiceRegions(
        [
            new WarehouseServiceRegion
            {
                CountryCode = "US",
                IsExcluded = false
            }
        ]);

        var productRoot = dataBuilder.CreateProductRoot("Grouped Variant Root", taxGroup);
        productRoot.RootUrl = "grouped-variant-root";
        productRoot.Description = "Grouped variant root description";

        var includedVariant = dataBuilder.CreateProduct("Grouped Variant A", productRoot, price: 100m, isDefault: true);
        includedVariant.Url = "https://test.example.com/products/grouped-variant-a";
        includedVariant.Images = ["https://cdn.example.com/products/grouped-variant-a.jpg"];

        var filteredOutVariant = dataBuilder.CreateProduct("Grouped Variant B", productRoot, price: 110m, isDefault: false);
        filteredOutVariant.Url = "https://test.example.com/products/grouped-variant-b";
        filteredOutVariant.Images = ["https://cdn.example.com/products/grouped-variant-b.jpg"];
        filteredOutVariant.RemoveFromFeed = true;

        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        dataBuilder.CreateProductWarehouse(includedVariant, warehouse, stock: 25);
        dataBuilder.CreateProductWarehouse(filteredOutVariant, warehouse, stock: 25);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var feed = new ProductFeed
        {
            Id = Guid.NewGuid(),
            Name = "Grouped Variant Feed",
            Slug = $"grouped-variant-feed-{Guid.NewGuid():N}",
            IsEnabled = true,
            CountryCode = "US",
            CurrencyCode = "USD",
            LanguageCode = "en",
            IncludeTaxInPrice = false
        };

        var result = await generator.GenerateAsync(feed);
        var document = XDocument.Parse(result.Xml);
        var items = document.Descendants("item").ToList();

        items.Count.ShouldBe(1);
        var itemGroupId = GetGoogleElementValue(items.Single(), "item_group_id");
        itemGroupId.ShouldBe(productRoot.Id.ToString());
    }

    [Fact]
    public async Task GenerateAsync_TitleFallback_UsesRootNameDashVariantNameWhenNoExplicitTitle()
    {
        var taxServiceMock = new Mock<ITaxService>();
        taxServiceMock
            .Setup(x => x.GetApplicableRateAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(20m);

        var generator = CreateGenerator(taxServiceMock);
        var dataBuilder = _fixture.CreateDataBuilder();

        var taxGroup = dataBuilder.CreateTaxGroup("Standard", 20m);
        var warehouse = dataBuilder.CreateWarehouse("Main Warehouse", "US");
        warehouse.SetServiceRegions(
        [
            new WarehouseServiceRegion
            {
                CountryCode = "US",
                IsExcluded = false
            }
        ]);

        var productRoot = dataBuilder.CreateProductRoot("T-Shirt Name", taxGroup);
        productRoot.RootUrl = "t-shirt-name";
        var product = dataBuilder.CreateProduct("A2", productRoot, price: 100m, isDefault: true);
        product.Url = "https://test.example.com/products/t-shirt-name-a2";
        product.Images = ["https://cdn.example.com/products/t-shirt-name-a2.jpg"];
        product.ShoppingFeedTitle = null;

        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 10);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var feed = new ProductFeed
        {
            Id = Guid.NewGuid(),
            Name = "Title Fallback Feed",
            Slug = $"title-fallback-feed-{Guid.NewGuid():N}",
            IsEnabled = true,
            CountryCode = "US",
            CurrencyCode = "USD",
            LanguageCode = "en",
            IncludeTaxInPrice = false
        };

        var result = await generator.GenerateAsync(feed);
        var item = GetSingleItem(result.Xml);

        var title = GetGoogleElementValue(item, "title");
        title.ShouldBe("T-Shirt Name - A2");
    }

    private GoogleProductFeedGenerator CreateGenerator(
        Mock<ITaxService> taxServiceMock,
        Mock<IShippingProviderManager>? shippingProviderManagerMock = null)
    {
        var resolverRegistryMock = new Mock<IProductFeedResolverRegistry>();
        resolverRegistryMock
            .Setup(x => x.GetResolvers())
            .Returns([]);
        resolverRegistryMock
            .Setup(x => x.GetResolver(It.IsAny<string>()))
            .Returns((IProductFeedValueResolver?)null);

        var mediaUrlResolverMock = new Mock<IProductFeedMediaUrlResolver>();
        mediaUrlResolverMock
            .Setup(x => x.ResolveMediaUrl(It.IsAny<string?>()))
            .Returns((string? value) => value);

        if (shippingProviderManagerMock == null)
        {
            shippingProviderManagerMock = new Mock<IShippingProviderManager>();
            shippingProviderManagerMock
                .Setup(x => x.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
                .ReturnsAsync([]);
        }

        return new GoogleProductFeedGenerator(
            _scopeProvider,
            _exchangeRateCache,
            taxServiceMock.Object,
            resolverRegistryMock.Object,
            mediaUrlResolverMock.Object,
            _shippingOptionEligibilityService,
            shippingProviderManagerMock.Object,
            _httpContextAccessor,
            _currencyService,
            _settings,
            NullLogger<GoogleProductFeedGenerator>.Instance);
    }

    private async Task<(Product Product, ProductFeed Feed)> SeedProductScenarioAsync(
        string countryCode,
        bool? includeTaxInPrice,
        bool allowExternalCarrierShipping = true,
        Action<TestDataBuilder, Warehouse>? addShippingOptions = null)
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var taxGroup = dataBuilder.CreateTaxGroup("Standard", 20m);
        var warehouse = dataBuilder.CreateWarehouse("Main Warehouse", countryCode);
        warehouse.SetServiceRegions(
        [
            new WarehouseServiceRegion
            {
                CountryCode = countryCode.ToUpperInvariant(),
                IsExcluded = false
            }
        ]);

        var productRoot = dataBuilder.CreateProductRoot("Feed Product Root", taxGroup);
        productRoot.RootUrl = "feed-product-root";
        productRoot.Description = "Feed product description";
        productRoot.AllowExternalCarrierShipping = allowExternalCarrierShipping;

        var product = dataBuilder.CreateProduct("Feed Product", productRoot, price: 100m);
        product.Url = "https://test.example.com/products/feed-product";
        product.Images = ["https://cdn.example.com/products/feed-product.jpg"];

        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 25);

        addShippingOptions?.Invoke(dataBuilder, warehouse);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var feed = new ProductFeed
        {
            Id = Guid.NewGuid(),
            Name = "Test Feed",
            Slug = $"test-feed-{Guid.NewGuid():N}",
            IsEnabled = true,
            CountryCode = countryCode,
            CurrencyCode = "USD",
            LanguageCode = "en",
            IncludeTaxInPrice = includeTaxInPrice
        };

        return (product, feed);
    }

    private static RegisteredShippingProvider CreateRegisteredProvider(
        string key,
        string displayName,
        bool usesLiveRates)
    {
        var providerMock = new Mock<IShippingProvider>();
        providerMock
            .SetupGet(x => x.Metadata)
            .Returns(new ShippingProviderMetadata
            {
                Key = key,
                DisplayName = displayName,
                SupportsRealTimeRates = usesLiveRates,
                ConfigCapabilities = new ProviderConfigCapabilities
                {
                    UsesLiveRates = usesLiveRates
                }
            });

        var configuration = new ShippingProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = key,
            DisplayName = displayName,
            IsEnabled = true
        };

        return new RegisteredShippingProvider(providerMock.Object, configuration);
    }

    private static XElement GetSingleItem(string xml)
    {
        var document = XDocument.Parse(xml);
        return document.Descendants("item").Single();
    }

    private static string? GetGoogleElementValue(XElement item, string name)
    {
        XNamespace g = "http://base.google.com/ns/1.0";
        return item.Element(g + name)?.Value;
    }
}
