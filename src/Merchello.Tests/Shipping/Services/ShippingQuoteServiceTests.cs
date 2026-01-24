using Merchello.Core.Accounting.Models;
using Merchello.Core.Caching.Services.Interfaces;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Shipping.Providers.Interfaces;
using Merchello.Core.Shipping.Services;
using Merchello.Core.Shipping.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Shipping.Services;

public class ShippingQuoteServiceTests
{
    private readonly Mock<IShippingProviderManager> _providerManagerMock;
    private readonly Mock<IShippingCostResolver> _costResolverMock;
    private readonly Mock<IWarehouseProviderConfigService> _warehouseConfigServiceMock;
    private readonly Mock<ICacheService> _cacheServiceMock;
    private readonly Mock<ILogger<ShippingQuoteService>> _loggerMock;
    private readonly ShippingQuoteService _sut;

    public ShippingQuoteServiceTests()
    {
        _providerManagerMock = new Mock<IShippingProviderManager>();
        _costResolverMock = new Mock<IShippingCostResolver>();
        _warehouseConfigServiceMock = new Mock<IWarehouseProviderConfigService>();
        _cacheServiceMock = new Mock<ICacheService>();
        _loggerMock = new Mock<ILogger<ShippingQuoteService>>();

        // Configure cache to always invoke the factory (bypass caching in tests)
        _cacheServiceMock
            .Setup(c => c.GetOrCreateAsync(
                It.IsAny<string>(),
                It.IsAny<Func<CancellationToken, Task<List<ShippingRateQuote>>>>(),
                It.IsAny<TimeSpan?>(),
                It.IsAny<IEnumerable<string>?>(),
                It.IsAny<CancellationToken>()))
            .Returns<string, Func<CancellationToken, Task<List<ShippingRateQuote>>>, TimeSpan?, IEnumerable<string>?, CancellationToken>(
                (_, factory, _, _, ct) => factory(ct));

        // We cannot mock IEFCoreScopeProvider<MerchelloDbContext> easily for the basket-level path
        // since it uses EF Core. For GetQuotesForWarehouseAsync, the scope provider is not used.
        _sut = new ShippingQuoteService(
            efCoreScopeProvider: null!,
            _providerManagerMock.Object,
            _costResolverMock.Object,
            _warehouseConfigServiceMock.Object,
            _cacheServiceMock.Object,
            _loggerMock.Object);
    }

    #region GetQuotesForWarehouseAsync - No providers configured

    [Fact]
    public async Task GetQuotesForWarehouseAsync_ReturnsEmpty_WhenNoProvidersConfigured()
    {
        // Arrange
        var warehouseId = Guid.NewGuid();
        var warehouseAddress = new Address { CountryCode = "US", PostalCode = "10001" };
        var packages = new List<ShipmentPackage>
        {
            new(2.5m, 30m, 20m, 15m)
        };

        _providerManagerMock
            .Setup(m => m.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<RegisteredShippingProvider>());

        _warehouseConfigServiceMock
            .Setup(m => m.GetByWarehouseAsync(warehouseId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<WarehouseProviderConfig>());

        // Act
        var result = await _sut.GetQuotesForWarehouseAsync(
            warehouseId, warehouseAddress, packages, "GB", null, "SW1A 1AA", "GBP");

        // Assert
        result.ShouldNotBeNull();
        result.ShouldBeEmpty();
    }

    #endregion

    #region GetQuotesForWarehouseAsync - Returns quotes from warehouse-specific providers

    [Fact]
    public async Task GetQuotesForWarehouseAsync_ReturnsQuotes_FromDynamicProviders()
    {
        // Arrange
        var warehouseId = Guid.NewGuid();
        var warehouseAddress = new Address { CountryCode = "US", PostalCode = "90210" };
        var packages = new List<ShipmentPackage>
        {
            new(5m, 40m, 30m, 20m)
        };

        var expectedQuote = new ShippingRateQuote
        {
            ProviderKey = "fedex",
            ProviderName = "FedEx",
            ServiceLevels =
            [
                new ShippingServiceLevel
                {
                    ServiceCode = "FEDEX_GROUND",
                    ServiceName = "FedEx Ground",
                    TotalCost = 12.99m,
                    CurrencyCode = "USD",
                    TransitTime = TimeSpan.FromDays(5)
                },
                new ShippingServiceLevel
                {
                    ServiceCode = "FEDEX_2_DAY",
                    ServiceName = "FedEx 2Day",
                    TotalCost = 24.50m,
                    CurrencyCode = "USD",
                    TransitTime = TimeSpan.FromDays(2)
                }
            ]
        };

        var providerMock = new Mock<IShippingProvider>();
        providerMock.Setup(p => p.Metadata).Returns(new ShippingProviderMetadata
        {
            Key = "fedex",
            DisplayName = "FedEx",
            ConfigCapabilities = new ProviderConfigCapabilities { UsesLiveRates = true }
        });
        providerMock.Setup(p => p.IsAvailableFor(It.IsAny<ShippingQuoteRequest>())).Returns(true);
        providerMock
            .Setup(p => p.GetRatesForAllServicesAsync(
                It.IsAny<ShippingQuoteRequest>(),
                It.IsAny<WarehouseProviderConfig>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedQuote);

        var config = new ShippingProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = "fedex",
            IsEnabled = true,
            SortOrder = 1
        };

        var registeredProvider = new RegisteredShippingProvider(providerMock.Object, config);

        _providerManagerMock
            .Setup(m => m.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { registeredProvider });

        var warehouseConfig = new WarehouseProviderConfig
        {
            Id = Guid.NewGuid(),
            WarehouseId = warehouseId,
            ProviderKey = "fedex",
            IsEnabled = true,
            DefaultMarkupPercent = 0
        };

        _warehouseConfigServiceMock
            .Setup(m => m.GetByWarehouseAsync(warehouseId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { warehouseConfig });

        // Act
        var result = await _sut.GetQuotesForWarehouseAsync(
            warehouseId, warehouseAddress, packages, "GB", null, "EC1A 1BB", "USD");

        // Assert
        result.ShouldNotBeNull();
        result.Count.ShouldBe(1);

        var quote = result.First();
        quote.ProviderKey.ShouldBe("fedex");
        quote.ProviderName.ShouldBe("FedEx");
        quote.ServiceLevels.Count.ShouldBe(2);

        var ground = quote.ServiceLevels.First(s => s.ServiceCode == "FEDEX_GROUND");
        ground.TotalCost.ShouldBe(12.99m);
        ground.CurrencyCode.ShouldBe("USD");

        var twoDay = quote.ServiceLevels.First(s => s.ServiceCode == "FEDEX_2_DAY");
        twoDay.TotalCost.ShouldBe(24.50m);
    }

    [Fact]
    public async Task GetQuotesForWarehouseAsync_SkipsProvider_WhenWarehouseConfigIsDisabled()
    {
        // Arrange
        var warehouseId = Guid.NewGuid();
        var warehouseAddress = new Address { CountryCode = "US", PostalCode = "30301" };
        var packages = new List<ShipmentPackage> { new(1m) };

        var providerMock = new Mock<IShippingProvider>();
        providerMock.Setup(p => p.Metadata).Returns(new ShippingProviderMetadata
        {
            Key = "ups",
            DisplayName = "UPS",
            ConfigCapabilities = new ProviderConfigCapabilities { UsesLiveRates = true }
        });
        providerMock.Setup(p => p.IsAvailableFor(It.IsAny<ShippingQuoteRequest>())).Returns(true);

        var config = new ShippingProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = "ups",
            IsEnabled = true,
            SortOrder = 1
        };

        var registeredProvider = new RegisteredShippingProvider(providerMock.Object, config);

        _providerManagerMock
            .Setup(m => m.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { registeredProvider });

        // Warehouse config has IsEnabled = false
        var warehouseConfig = new WarehouseProviderConfig
        {
            Id = Guid.NewGuid(),
            WarehouseId = warehouseId,
            ProviderKey = "ups",
            IsEnabled = false,
            DefaultMarkupPercent = 0
        };

        _warehouseConfigServiceMock
            .Setup(m => m.GetByWarehouseAsync(warehouseId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { warehouseConfig });

        // Act
        var result = await _sut.GetQuotesForWarehouseAsync(
            warehouseId, warehouseAddress, packages, "US", "CA", "90210", "USD");

        // Assert
        result.ShouldBeEmpty();

        // Provider's GetRatesForAllServicesAsync should never have been called
        providerMock.Verify(
            p => p.GetRatesForAllServicesAsync(
                It.IsAny<ShippingQuoteRequest>(),
                It.IsAny<WarehouseProviderConfig>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

    #endregion

    #region GetQuotesForWarehouseAsync - Empty packages returns empty

    [Fact]
    public async Task GetQuotesForWarehouseAsync_ReturnsEmpty_WhenPackagesEmpty()
    {
        // Arrange
        var warehouseId = Guid.NewGuid();
        var warehouseAddress = new Address { CountryCode = "US", PostalCode = "10001" };
        IReadOnlyCollection<ShipmentPackage> packages = Array.Empty<ShipmentPackage>();

        // Act
        var result = await _sut.GetQuotesForWarehouseAsync(
            warehouseId, warehouseAddress, packages, "US", "NY", "10001", "USD");

        // Assert
        result.ShouldBeEmpty();

        // Should not even call enabled providers since packages is empty
        _providerManagerMock.Verify(
            m => m.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()),
            Times.Never);
    }

    #endregion

    #region GetQuotesForWarehouseAsync - Multiple providers

    [Fact]
    public async Task GetQuotesForWarehouseAsync_ReturnsQuotes_FromMultipleDynamicProviders()
    {
        // Arrange
        var warehouseId = Guid.NewGuid();
        var warehouseAddress = new Address { CountryCode = "US", PostalCode = "60601" };
        var packages = new List<ShipmentPackage> { new(3m, 25m, 25m, 25m) };

        // FedEx provider
        var fedexProviderMock = new Mock<IShippingProvider>();
        fedexProviderMock.Setup(p => p.Metadata).Returns(new ShippingProviderMetadata
        {
            Key = "fedex",
            DisplayName = "FedEx",
            ConfigCapabilities = new ProviderConfigCapabilities { UsesLiveRates = true }
        });
        fedexProviderMock.Setup(p => p.IsAvailableFor(It.IsAny<ShippingQuoteRequest>())).Returns(true);
        fedexProviderMock
            .Setup(p => p.GetRatesForAllServicesAsync(
                It.IsAny<ShippingQuoteRequest>(),
                It.IsAny<WarehouseProviderConfig>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ShippingRateQuote
            {
                ProviderKey = "fedex",
                ProviderName = "FedEx",
                ServiceLevels =
                [
                    new ShippingServiceLevel
                    {
                        ServiceCode = "FEDEX_GROUND",
                        ServiceName = "FedEx Ground",
                        TotalCost = 9.99m,
                        CurrencyCode = "USD"
                    }
                ]
            });

        // UPS provider
        var upsProviderMock = new Mock<IShippingProvider>();
        upsProviderMock.Setup(p => p.Metadata).Returns(new ShippingProviderMetadata
        {
            Key = "ups",
            DisplayName = "UPS",
            ConfigCapabilities = new ProviderConfigCapabilities { UsesLiveRates = true }
        });
        upsProviderMock.Setup(p => p.IsAvailableFor(It.IsAny<ShippingQuoteRequest>())).Returns(true);
        upsProviderMock
            .Setup(p => p.GetRatesForAllServicesAsync(
                It.IsAny<ShippingQuoteRequest>(),
                It.IsAny<WarehouseProviderConfig>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ShippingRateQuote
            {
                ProviderKey = "ups",
                ProviderName = "UPS",
                ServiceLevels =
                [
                    new ShippingServiceLevel
                    {
                        ServiceCode = "UPS_GROUND",
                        ServiceName = "UPS Ground",
                        TotalCost = 11.49m,
                        CurrencyCode = "USD"
                    }
                ]
            });

        var fedexConfig = new ShippingProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = "fedex",
            IsEnabled = true,
            SortOrder = 1
        };

        var upsConfig = new ShippingProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = "ups",
            IsEnabled = true,
            SortOrder = 2
        };

        _providerManagerMock
            .Setup(m => m.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new RegisteredShippingProvider(fedexProviderMock.Object, fedexConfig),
                new RegisteredShippingProvider(upsProviderMock.Object, upsConfig)
            });

        _warehouseConfigServiceMock
            .Setup(m => m.GetByWarehouseAsync(warehouseId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<WarehouseProviderConfig>
            {
                new() { WarehouseId = warehouseId, ProviderKey = "fedex", IsEnabled = true },
                new() { WarehouseId = warehouseId, ProviderKey = "ups", IsEnabled = true }
            });

        // Act
        var result = await _sut.GetQuotesForWarehouseAsync(
            warehouseId, warehouseAddress, packages, "US", "IL", "60601", "USD");

        // Assert
        result.Count.ShouldBe(2);
        result.ShouldContain(q => q.ProviderKey == "fedex");
        result.ShouldContain(q => q.ProviderKey == "ups");

        var fedexQuote = result.First(q => q.ProviderKey == "fedex");
        fedexQuote.ServiceLevels.First().TotalCost.ShouldBe(9.99m);

        var upsQuote = result.First(q => q.ProviderKey == "ups");
        upsQuote.ServiceLevels.First().TotalCost.ShouldBe(11.49m);
    }

    #endregion

    #region GetQuotesForWarehouseAsync - Provider not available for request

    [Fact]
    public async Task GetQuotesForWarehouseAsync_SkipsProvider_WhenNotAvailableForRequest()
    {
        // Arrange
        var warehouseId = Guid.NewGuid();
        var warehouseAddress = new Address { CountryCode = "US", PostalCode = "10001" };
        var packages = new List<ShipmentPackage> { new(1m) };

        var providerMock = new Mock<IShippingProvider>();
        providerMock.Setup(p => p.Metadata).Returns(new ShippingProviderMetadata
        {
            Key = "fedex",
            DisplayName = "FedEx",
            ConfigCapabilities = new ProviderConfigCapabilities { UsesLiveRates = true }
        });
        // Provider says it's NOT available for this request
        providerMock.Setup(p => p.IsAvailableFor(It.IsAny<ShippingQuoteRequest>())).Returns(false);

        var config = new ShippingProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = "fedex",
            IsEnabled = true,
            SortOrder = 1
        };

        _providerManagerMock
            .Setup(m => m.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { new RegisteredShippingProvider(providerMock.Object, config) });

        _warehouseConfigServiceMock
            .Setup(m => m.GetByWarehouseAsync(warehouseId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<WarehouseProviderConfig>());

        // Act
        var result = await _sut.GetQuotesForWarehouseAsync(
            warehouseId, warehouseAddress, packages, "US", null, null, "USD");

        // Assert
        result.ShouldBeEmpty();

        providerMock.Verify(
            p => p.GetRatesForAllServicesAsync(
                It.IsAny<ShippingQuoteRequest>(),
                It.IsAny<WarehouseProviderConfig>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

    #endregion

    #region GetQuotesForWarehouseAsync - Provider throws exception

    [Fact]
    public async Task GetQuotesForWarehouseAsync_ContinuesProcessing_WhenProviderThrows()
    {
        // Arrange
        var warehouseId = Guid.NewGuid();
        var warehouseAddress = new Address { CountryCode = "US", PostalCode = "10001" };
        var packages = new List<ShipmentPackage> { new(2m) };

        // Failing provider
        var failingProviderMock = new Mock<IShippingProvider>();
        failingProviderMock.Setup(p => p.Metadata).Returns(new ShippingProviderMetadata
        {
            Key = "broken-provider",
            DisplayName = "Broken Provider",
            ConfigCapabilities = new ProviderConfigCapabilities { UsesLiveRates = true }
        });
        failingProviderMock.Setup(p => p.IsAvailableFor(It.IsAny<ShippingQuoteRequest>())).Returns(true);
        failingProviderMock
            .Setup(p => p.GetRatesForAllServicesAsync(
                It.IsAny<ShippingQuoteRequest>(),
                It.IsAny<WarehouseProviderConfig>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("Carrier API unavailable"));

        // Working provider
        var workingProviderMock = new Mock<IShippingProvider>();
        workingProviderMock.Setup(p => p.Metadata).Returns(new ShippingProviderMetadata
        {
            Key = "ups",
            DisplayName = "UPS",
            ConfigCapabilities = new ProviderConfigCapabilities { UsesLiveRates = true }
        });
        workingProviderMock.Setup(p => p.IsAvailableFor(It.IsAny<ShippingQuoteRequest>())).Returns(true);
        workingProviderMock
            .Setup(p => p.GetRatesForAllServicesAsync(
                It.IsAny<ShippingQuoteRequest>(),
                It.IsAny<WarehouseProviderConfig>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ShippingRateQuote
            {
                ProviderKey = "ups",
                ProviderName = "UPS",
                ServiceLevels =
                [
                    new ShippingServiceLevel
                    {
                        ServiceCode = "UPS_GROUND",
                        ServiceName = "UPS Ground",
                        TotalCost = 8.99m,
                        CurrencyCode = "USD"
                    }
                ]
            });

        _providerManagerMock
            .Setup(m => m.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new RegisteredShippingProvider(failingProviderMock.Object, new ShippingProviderConfiguration
                {
                    Id = Guid.NewGuid(), ProviderKey = "broken-provider", IsEnabled = true, SortOrder = 1
                }),
                new RegisteredShippingProvider(workingProviderMock.Object, new ShippingProviderConfiguration
                {
                    Id = Guid.NewGuid(), ProviderKey = "ups", IsEnabled = true, SortOrder = 2
                })
            });

        _warehouseConfigServiceMock
            .Setup(m => m.GetByWarehouseAsync(warehouseId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<WarehouseProviderConfig>
            {
                new() { WarehouseId = warehouseId, ProviderKey = "broken-provider", IsEnabled = true },
                new() { WarehouseId = warehouseId, ProviderKey = "ups", IsEnabled = true }
            });

        // Act
        var result = await _sut.GetQuotesForWarehouseAsync(
            warehouseId, warehouseAddress, packages, "US", "NY", "10001", "USD");

        // Assert - should still return the working provider's quotes
        result.Count.ShouldBe(1);
        result.First().ProviderKey.ShouldBe("ups");
        result.First().ServiceLevels.First().TotalCost.ShouldBe(8.99m);
    }

    #endregion

    #region GetQuotesForWarehouseAsync - Non-live-rate providers are skipped

    [Fact]
    public async Task GetQuotesForWarehouseAsync_SkipsFlatRateProvider_InWarehouseLevelPath()
    {
        // Arrange
        var warehouseId = Guid.NewGuid();
        var warehouseAddress = new Address { CountryCode = "GB", PostalCode = "SW1A 1AA" };
        var packages = new List<ShipmentPackage> { new(1.5m) };

        // Flat-rate provider (UsesLiveRates = false)
        var flatRateProviderMock = new Mock<IShippingProvider>();
        flatRateProviderMock.Setup(p => p.Metadata).Returns(new ShippingProviderMetadata
        {
            Key = "flat-rate",
            DisplayName = "Flat Rate",
            ConfigCapabilities = new ProviderConfigCapabilities { UsesLiveRates = false }
        });
        flatRateProviderMock.Setup(p => p.IsAvailableFor(It.IsAny<ShippingQuoteRequest>())).Returns(true);

        var config = new ShippingProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = "flat-rate",
            IsEnabled = true,
            SortOrder = 1
        };

        _providerManagerMock
            .Setup(m => m.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { new RegisteredShippingProvider(flatRateProviderMock.Object, config) });

        _warehouseConfigServiceMock
            .Setup(m => m.GetByWarehouseAsync(warehouseId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<WarehouseProviderConfig>());

        // Act
        var result = await _sut.GetQuotesForWarehouseAsync(
            warehouseId, warehouseAddress, packages, "GB", null, "EC1A 1BB", "GBP");

        // Assert - flat-rate providers are not called via the warehouse-level path
        result.ShouldBeEmpty();

        flatRateProviderMock.Verify(
            p => p.GetRatesForAllServicesAsync(
                It.IsAny<ShippingQuoteRequest>(),
                It.IsAny<WarehouseProviderConfig>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

    #endregion

    #region GetQuotesForWarehouseAsync - Default config when warehouse has no config

    [Fact]
    public async Task GetQuotesForWarehouseAsync_UsesDefaultConfig_WhenNoWarehouseConfigExists()
    {
        // Arrange
        var warehouseId = Guid.NewGuid();
        var warehouseAddress = new Address { CountryCode = "US", PostalCode = "10001" };
        var packages = new List<ShipmentPackage> { new(2m) };

        var providerMock = new Mock<IShippingProvider>();
        providerMock.Setup(p => p.Metadata).Returns(new ShippingProviderMetadata
        {
            Key = "fedex",
            DisplayName = "FedEx",
            ConfigCapabilities = new ProviderConfigCapabilities { UsesLiveRates = true }
        });
        providerMock.Setup(p => p.IsAvailableFor(It.IsAny<ShippingQuoteRequest>())).Returns(true);
        providerMock
            .Setup(p => p.GetRatesForAllServicesAsync(
                It.IsAny<ShippingQuoteRequest>(),
                It.Is<WarehouseProviderConfig>(c =>
                    c.WarehouseId == warehouseId &&
                    c.ProviderKey == "fedex" &&
                    c.IsEnabled &&
                    c.DefaultMarkupPercent == 0),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ShippingRateQuote
            {
                ProviderKey = "fedex",
                ProviderName = "FedEx",
                ServiceLevels =
                [
                    new ShippingServiceLevel
                    {
                        ServiceCode = "FEDEX_GROUND",
                        ServiceName = "FedEx Ground",
                        TotalCost = 15.00m,
                        CurrencyCode = "USD"
                    }
                ]
            });

        var config = new ShippingProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = "fedex",
            IsEnabled = true,
            SortOrder = 1
        };

        _providerManagerMock
            .Setup(m => m.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { new RegisteredShippingProvider(providerMock.Object, config) });

        // No warehouse configs exist
        _warehouseConfigServiceMock
            .Setup(m => m.GetByWarehouseAsync(warehouseId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<WarehouseProviderConfig>());

        // Act
        var result = await _sut.GetQuotesForWarehouseAsync(
            warehouseId, warehouseAddress, packages, "US", "NY", "10001", "USD");

        // Assert - provider should be called with a default config (no markup, enabled)
        result.Count.ShouldBe(1);
        result.First().ProviderKey.ShouldBe("fedex");
        result.First().ServiceLevels.First().TotalCost.ShouldBe(15.00m);

        providerMock.Verify(
            p => p.GetRatesForAllServicesAsync(
                It.IsAny<ShippingQuoteRequest>(),
                It.Is<WarehouseProviderConfig>(c =>
                    c.WarehouseId == warehouseId &&
                    c.ProviderKey == "fedex" &&
                    c.IsEnabled &&
                    c.DefaultMarkupPercent == 0),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    #endregion

    #region GetQuotesAsync - Empty basket returns empty

    [Fact]
    public async Task GetQuotesAsync_ReturnsEmpty_WhenBasketHasNoProductLineItems()
    {
        // Arrange
        var basket = new Basket
        {
            Id = Guid.NewGuid(),
            Currency = "USD",
            LineItems =
            [
                new LineItem
                {
                    LineItemType = LineItemType.Discount,
                    Quantity = 1,
                    Amount = -5.00m
                }
            ]
        };

        // Act
        var result = await _sut.GetQuotesAsync(basket, "US");

        // Assert
        result.ShouldBeEmpty();
    }

    [Fact]
    public async Task GetQuotesAsync_ReturnsEmpty_WhenBasketIsEmpty()
    {
        // Arrange
        var basket = new Basket
        {
            Id = Guid.NewGuid(),
            Currency = "GBP",
            LineItems = []
        };

        // Act
        var result = await _sut.GetQuotesAsync(basket, "GB");

        // Assert
        result.ShouldBeEmpty();
    }

    #endregion

    #region GetQuotesForWarehouseAsync - Provider returns null quote

    [Fact]
    public async Task GetQuotesForWarehouseAsync_ExcludesNullQuotes()
    {
        // Arrange
        var warehouseId = Guid.NewGuid();
        var warehouseAddress = new Address { CountryCode = "US", PostalCode = "10001" };
        var packages = new List<ShipmentPackage> { new(1m) };

        var providerMock = new Mock<IShippingProvider>();
        providerMock.Setup(p => p.Metadata).Returns(new ShippingProviderMetadata
        {
            Key = "fedex",
            DisplayName = "FedEx",
            ConfigCapabilities = new ProviderConfigCapabilities { UsesLiveRates = true }
        });
        providerMock.Setup(p => p.IsAvailableFor(It.IsAny<ShippingQuoteRequest>())).Returns(true);
        providerMock
            .Setup(p => p.GetRatesForAllServicesAsync(
                It.IsAny<ShippingQuoteRequest>(),
                It.IsAny<WarehouseProviderConfig>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((ShippingRateQuote?)null);

        var config = new ShippingProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = "fedex",
            IsEnabled = true,
            SortOrder = 1
        };

        _providerManagerMock
            .Setup(m => m.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { new RegisteredShippingProvider(providerMock.Object, config) });

        _warehouseConfigServiceMock
            .Setup(m => m.GetByWarehouseAsync(warehouseId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<WarehouseProviderConfig>());

        // Act
        var result = await _sut.GetQuotesForWarehouseAsync(
            warehouseId, warehouseAddress, packages, "US", null, null, "USD");

        // Assert
        result.ShouldBeEmpty();
    }

    #endregion

    #region GetQuotesForWarehouseAsync - Builds correct request

    [Fact]
    public async Task GetQuotesForWarehouseAsync_BuildsCorrectRequest_WithWarehouseDetails()
    {
        // Arrange
        var warehouseId = Guid.NewGuid();
        var warehouseAddress = new Address
        {
            CountryCode = "US",
            PostalCode = "90210",
            TownCity = "Beverly Hills"
        };
        var packages = new List<ShipmentPackage>
        {
            new(2m, 30m, 20m, 15m),
            new(1m, 20m, 15m, 10m)
        };

        ShippingQuoteRequest? capturedRequest = null;

        var providerMock = new Mock<IShippingProvider>();
        providerMock.Setup(p => p.Metadata).Returns(new ShippingProviderMetadata
        {
            Key = "fedex",
            DisplayName = "FedEx",
            ConfigCapabilities = new ProviderConfigCapabilities { UsesLiveRates = true }
        });
        providerMock.Setup(p => p.IsAvailableFor(It.IsAny<ShippingQuoteRequest>())).Returns(true);
        providerMock
            .Setup(p => p.GetRatesForAllServicesAsync(
                It.IsAny<ShippingQuoteRequest>(),
                It.IsAny<WarehouseProviderConfig>(),
                It.IsAny<CancellationToken>()))
            .Callback<ShippingQuoteRequest, WarehouseProviderConfig, CancellationToken>(
                (req, _, _) => capturedRequest = req)
            .ReturnsAsync(new ShippingRateQuote
            {
                ProviderKey = "fedex",
                ProviderName = "FedEx",
                ServiceLevels = []
            });

        var config = new ShippingProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = "fedex",
            IsEnabled = true,
            SortOrder = 1
        };

        _providerManagerMock
            .Setup(m => m.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { new RegisteredShippingProvider(providerMock.Object, config) });

        _warehouseConfigServiceMock
            .Setup(m => m.GetByWarehouseAsync(warehouseId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<WarehouseProviderConfig>());

        // Act
        await _sut.GetQuotesForWarehouseAsync(
            warehouseId, warehouseAddress, packages, "GB", "ENG", "SW1A 1AA", "GBP");

        // Assert - verify the request was built correctly
        capturedRequest.ShouldNotBeNull();
        capturedRequest.OriginWarehouseId.ShouldBe(warehouseId);
        capturedRequest.OriginAddress.ShouldBe(warehouseAddress);
        capturedRequest.CountryCode.ShouldBe("GB");
        capturedRequest.StateOrProvinceCode.ShouldBe("ENG");
        capturedRequest.PostalCode.ShouldBe("SW1A 1AA");
        capturedRequest.CurrencyCode.ShouldBe("GBP");
        capturedRequest.Packages.Count.ShouldBe(2);
        capturedRequest.Items.ShouldBeEmpty();
        capturedRequest.ItemsSubtotal.ShouldBe(0m);
    }

    #endregion

    #region GetQuotesForWarehouseAsync - Fallback rate propagation

    [Fact]
    public async Task GetQuotesForWarehouseAsync_PropagatesFallbackRateInfo()
    {
        // Arrange
        var warehouseId = Guid.NewGuid();
        var warehouseAddress = new Address { CountryCode = "US", PostalCode = "10001" };
        var packages = new List<ShipmentPackage> { new(1m) };

        var providerMock = new Mock<IShippingProvider>();
        providerMock.Setup(p => p.Metadata).Returns(new ShippingProviderMetadata
        {
            Key = "fedex",
            DisplayName = "FedEx",
            ConfigCapabilities = new ProviderConfigCapabilities { UsesLiveRates = true }
        });
        providerMock.Setup(p => p.IsAvailableFor(It.IsAny<ShippingQuoteRequest>())).Returns(true);
        providerMock
            .Setup(p => p.GetRatesForAllServicesAsync(
                It.IsAny<ShippingQuoteRequest>(),
                It.IsAny<WarehouseProviderConfig>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ShippingRateQuote
            {
                ProviderKey = "fedex",
                ProviderName = "FedEx",
                IsFallbackRate = true,
                FallbackReason = "carrier_api_unavailable",
                ServiceLevels =
                [
                    new ShippingServiceLevel
                    {
                        ServiceCode = "FEDEX_GROUND",
                        ServiceName = "FedEx Ground",
                        TotalCost = 10.00m,
                        CurrencyCode = "USD"
                    }
                ],
                Errors = ["Carrier API returned 503"]
            });

        var config = new ShippingProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = "fedex",
            IsEnabled = true,
            SortOrder = 1
        };

        _providerManagerMock
            .Setup(m => m.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { new RegisteredShippingProvider(providerMock.Object, config) });

        _warehouseConfigServiceMock
            .Setup(m => m.GetByWarehouseAsync(warehouseId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<WarehouseProviderConfig>());

        // Act
        var result = await _sut.GetQuotesForWarehouseAsync(
            warehouseId, warehouseAddress, packages, "US", null, null, "USD");

        // Assert
        result.Count.ShouldBe(1);
        var quote = result.First();
        quote.IsFallbackRate.ShouldBeTrue();
        quote.FallbackReason.ShouldBe("carrier_api_unavailable");
        quote.Errors.ShouldContain("Carrier API returned 503");
    }

    #endregion
}
