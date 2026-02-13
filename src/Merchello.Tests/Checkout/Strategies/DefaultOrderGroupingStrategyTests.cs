using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Extensions;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Strategies;
using Merchello.Core.Checkout.Strategies.Models;
using Merchello.Core.Checkout.Factories;
using Merchello.Core.Locality.Factories;
using Merchello.Core.Locality.Models;
using Merchello.Core.Products.Factories;
using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Shipping.Providers.Interfaces;
using Merchello.Core.Shipping.Services;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Shipping.Services.Parameters;
using Merchello.Core.Shipping.Factories;
using Merchello.Core.Warehouses.Models;
using Merchello.Core.Warehouses.Factories;
using Merchello.Core.Notifications.Interfaces;
using Umbraco.Cms.Core.Notifications;
using Merchello.Core.Warehouses.Services.Interfaces;
using Merchello.Core.Warehouses.Services.Parameters;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Shouldly;
using Xunit;
using Merchello.Core.Shared.Models;

namespace Merchello.Tests.Checkout.Strategies;

public class DefaultOrderGroupingStrategyTests
{
    private readonly Mock<IWarehouseService> _warehouseServiceMock;
    private readonly Mock<IShippingCostResolver> _shippingCostResolverMock;
    private readonly IShippingOptionEligibilityService _shippingOptionEligibilityService;
    private readonly Mock<IShippingQuoteService> _shippingQuoteServiceMock;
    private readonly Mock<IShippingProviderManager> _shippingProviderManagerMock;
    private readonly Mock<IWarehouseProviderConfigService> _warehouseProviderConfigServiceMock;
    private readonly Mock<IMerchelloNotificationPublisher> _notificationPublisherMock;
    private readonly Mock<ILogger<DefaultOrderGroupingStrategy>> _loggerMock;
    private readonly DefaultOrderGroupingStrategy _strategy;

    public DefaultOrderGroupingStrategyTests()
    {
        _warehouseServiceMock = new Mock<IWarehouseService>();
        _shippingCostResolverMock = new Mock<IShippingCostResolver>();
        _shippingCostResolverMock.Setup(x => x.GetTotalShippingCost(
                It.IsAny<ShippingOption>(),
                It.IsAny<string>(),
                It.IsAny<string?>(),
                It.IsAny<decimal?>()))
            .Returns((ShippingOption so, string _, string? __, decimal? ___) => so.FixedCost ?? 0);
        _shippingOptionEligibilityService = new ShippingOptionEligibilityService(_shippingCostResolverMock.Object);
        _shippingQuoteServiceMock = new Mock<IShippingQuoteService>();
        _shippingProviderManagerMock = new Mock<IShippingProviderManager>();
        _shippingProviderManagerMock
            .Setup(x => x.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<RegisteredShippingProvider>());
        _warehouseProviderConfigServiceMock = new Mock<IWarehouseProviderConfigService>();
        _notificationPublisherMock = new Mock<IMerchelloNotificationPublisher>();
        _notificationPublisherMock
            .Setup(p => p.PublishCancelableAsync(It.IsAny<ICancelableNotification>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _loggerMock = new Mock<ILogger<DefaultOrderGroupingStrategy>>();
        var settings = Options.Create(new MerchelloSettings());
        _strategy = new DefaultOrderGroupingStrategy(
            _warehouseServiceMock.Object,
            _shippingOptionEligibilityService,
            _shippingCostResolverMock.Object,
            _shippingQuoteServiceMock.Object,
            _shippingProviderManagerMock.Object,
            _warehouseProviderConfigServiceMock.Object,
            _notificationPublisherMock.Object,
            settings,
            _loggerMock.Object);
    }

    [Fact]
    public void Metadata_ReturnsCorrectValues()
    {
        // Assert
        _strategy.Metadata.Key.ShouldBe("default-warehouse");
        _strategy.Metadata.DisplayName.ShouldBe("Warehouse Grouping");
        _strategy.Metadata.Description.ShouldNotBeNullOrEmpty();
    }

    [Fact]
    public async Task GroupItemsAsync_EmptyCountryCode_ReturnsError()
    {
        // Arrange
        var context = CreateContext(countryCode: "");

        // Act
        var result = await _strategy.GroupItemsAsync(context);

        // Assert
        result.Success.ShouldBeFalse();
        result.Errors.ShouldContain(e => e.Contains("country code"));
    }

    [Fact]
    public async Task GroupItemsAsync_SingleProduct_SingleWarehouse_CreatesOneGroup()
    {
        // Arrange
        var warehouseId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var shippingOptionId = Guid.NewGuid();

        var warehouse = CreateWarehouse(warehouseId, "Main Warehouse", shippingOptionId);
        var product = CreateProduct(productId, warehouse);

        var context = CreateContext(
            products: new Dictionary<Guid, Product> { [productId] = product },
            warehouses: new Dictionary<Guid, Warehouse> { [warehouseId] = warehouse },
            lineItems: [CreateLineItem(productId, quantity: 2)]);

        _warehouseServiceMock
            .Setup(x => x.SelectWarehouseForProduct(
                It.IsAny<SelectWarehouseForProductParameters>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WarehouseSelectionResult
            {
                Warehouse = warehouse
            });

        // Act
        var result = await _strategy.GroupItemsAsync(context);

        // Assert
        result.Success.ShouldBeTrue();
        result.Groups.Count.ShouldBe(1);
        result.Groups[0].WarehouseId.ShouldBe(warehouseId);
        result.Groups[0].LineItems.Count.ShouldBe(1);
        result.Groups[0].LineItems[0].Quantity.ShouldBe(2);
    }

    [Fact]
    public async Task GroupItemsAsync_TwoProducts_SameWarehouse_CreatesOneGroup()
    {
        // Arrange
        var warehouseId = Guid.NewGuid();
        var productId1 = Guid.NewGuid();
        var productId2 = Guid.NewGuid();
        var shippingOptionId = Guid.NewGuid();

        var warehouse = CreateWarehouse(warehouseId, "Main Warehouse", shippingOptionId);
        var product1 = CreateProduct(productId1, warehouse);
        var product2 = CreateProduct(productId2, warehouse);

        var context = CreateContext(
            products: new Dictionary<Guid, Product>
            {
                [productId1] = product1,
                [productId2] = product2
            },
            warehouses: new Dictionary<Guid, Warehouse> { [warehouseId] = warehouse },
            lineItems:
            [
                CreateLineItem(productId1, quantity: 1),
                CreateLineItem(productId2, quantity: 3)
            ]);

        _warehouseServiceMock
            .Setup(x => x.SelectWarehouseForProduct(
                It.IsAny<SelectWarehouseForProductParameters>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WarehouseSelectionResult
            {
                Warehouse = warehouse
            });

        // Act
        var result = await _strategy.GroupItemsAsync(context);

        // Assert
        result.Success.ShouldBeTrue();
        result.Groups.Count.ShouldBe(1);
        result.Groups[0].LineItems.Count.ShouldBe(2);
    }

    [Fact]
    public async Task GroupItemsAsync_TwoProducts_DifferentWarehouses_CreatesTwoGroups()
    {
        // Arrange
        var warehouseId1 = Guid.NewGuid();
        var warehouseId2 = Guid.NewGuid();
        var productId1 = Guid.NewGuid();
        var productId2 = Guid.NewGuid();
        var shippingOptionId = Guid.NewGuid();

        var warehouse1 = CreateWarehouse(warehouseId1, "London Warehouse", shippingOptionId);
        var warehouse2 = CreateWarehouse(warehouseId2, "Manchester Warehouse", shippingOptionId);
        var product1 = CreateProduct(productId1, warehouse1);
        var product2 = CreateProduct(productId2, warehouse2);

        var context = CreateContext(
            products: new Dictionary<Guid, Product>
            {
                [productId1] = product1,
                [productId2] = product2
            },
            warehouses: new Dictionary<Guid, Warehouse>
            {
                [warehouseId1] = warehouse1,
                [warehouseId2] = warehouse2
            },
            lineItems:
            [
                CreateLineItem(productId1, quantity: 1),
                CreateLineItem(productId2, quantity: 1)
            ]);

        _warehouseServiceMock
            .Setup(x => x.SelectWarehouseForProduct(
                It.Is<SelectWarehouseForProductParameters>(p => p.Product.Id == productId1),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WarehouseSelectionResult
            {
                Warehouse = warehouse1
            });

        _warehouseServiceMock
            .Setup(x => x.SelectWarehouseForProduct(
                It.Is<SelectWarehouseForProductParameters>(p => p.Product.Id == productId2),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WarehouseSelectionResult
            {
                Warehouse = warehouse2
            });

        // Act
        var result = await _strategy.GroupItemsAsync(context);

        // Assert
        result.Success.ShouldBeTrue();
        result.Groups.Count.ShouldBe(2);
        result.Groups.ShouldContain(g => g.WarehouseId == warehouseId1);
        result.Groups.ShouldContain(g => g.WarehouseId == warehouseId2);
    }

    [Fact]
    public async Task GroupItemsAsync_WarehouseSelectionFails_AddsError()
    {
        // Arrange
        var productId = Guid.NewGuid();
        var product = CreateProduct(productId, null!);

        var context = CreateContext(
            products: new Dictionary<Guid, Product> { [productId] = product },
            warehouses: new Dictionary<Guid, Warehouse>(),
            lineItems: [CreateLineItem(productId)]);

        _warehouseServiceMock
            .Setup(x => x.SelectWarehouseForProduct(
                It.IsAny<SelectWarehouseForProductParameters>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WarehouseSelectionResult
            {
                FailureReason = "No warehouse has sufficient stock"
            });

        // Act
        var result = await _strategy.GroupItemsAsync(context);

        // Assert
        result.Errors.ShouldContain(e => e.Contains("No warehouse has sufficient stock"));
    }

    [Fact]
    public async Task GroupItemsAsync_DeterministicGroupId_ConsistentAcrossCalls()
    {
        // Arrange
        var warehouseId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var shippingOptionId = Guid.NewGuid();

        var warehouse = CreateWarehouse(warehouseId, "Test", shippingOptionId);
        var product = CreateProduct(productId, warehouse);

        var context = CreateContext(
            products: new Dictionary<Guid, Product> { [productId] = product },
            warehouses: new Dictionary<Guid, Warehouse> { [warehouseId] = warehouse },
            lineItems: [CreateLineItem(productId)]);

        _warehouseServiceMock
            .Setup(x => x.SelectWarehouseForProduct(
                It.IsAny<SelectWarehouseForProductParameters>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WarehouseSelectionResult
            {
                Warehouse = warehouse
            });

        // Act
        var result1 = await _strategy.GroupItemsAsync(context);
        var result2 = await _strategy.GroupItemsAsync(context);

        // Assert
        result1.Groups[0].GroupId.ShouldBe(result2.Groups[0].GroupId);
    }

    [Fact]
    public async Task GroupItemsAsync_ExcludesShippingOption_WhenDestinationIsExcluded()
    {
        // Arrange
        var warehouseId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var shippingOptionId = Guid.NewGuid();

        var warehouse = CreateWarehouse(warehouseId, "Main Warehouse", shippingOptionId);
        var option = warehouse.ShippingOptions.First();
        option.SetExcludedRegions(
        [
            new ShippingOptionExcludedRegion
            {
                CountryCode = "GB"
            }
        ]);

        var product = CreateProduct(productId, warehouse);
        var context = CreateContext(
            products: new Dictionary<Guid, Product> { [productId] = product },
            warehouses: new Dictionary<Guid, Warehouse> { [warehouseId] = warehouse },
            lineItems: [CreateLineItem(productId)],
            countryCode: "GB");

        _warehouseServiceMock
            .Setup(x => x.SelectWarehouseForProduct(
                It.IsAny<SelectWarehouseForProductParameters>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WarehouseSelectionResult
            {
                Warehouse = warehouse
            });

        // Act
        var result = await _strategy.GroupItemsAsync(context);

        // Assert
        result.Success.ShouldBeTrue();
        result.Groups.Count.ShouldBe(1);
        result.Groups[0].AvailableShippingOptions.ShouldBeEmpty();
    }

    [Fact]
    public async Task GroupItemsAsync_DynamicProvider_AppliesDaysOverride_FromWarehouseConfig()
    {
        // Arrange
        var warehouseId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var shippingOptionId = Guid.NewGuid();

        var warehouse = CreateWarehouse(warehouseId, "Main Warehouse", shippingOptionId);
        var product = CreateProduct(productId, warehouse);
        product.PackageConfigurations = [new ProductPackage { Weight = 1.5m, LengthCm = 30, WidthCm = 20, HeightCm = 10 }];
        product.ProductRoot!.AllowExternalCarrierShipping = true;

        var lineItems = new List<LineItem>
        {
            CreateLineItem(productId, quantity: 1, amount: 50m)
        };

        var context = CreateContext(
            products: new Dictionary<Guid, Product> { [productId] = product },
            warehouses: new Dictionary<Guid, Warehouse> { [warehouseId] = warehouse },
            lineItems: lineItems,
            countryCode: "GB");

        _warehouseServiceMock
            .Setup(x => x.SelectWarehouseForProduct(
                It.IsAny<SelectWarehouseForProductParameters>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WarehouseSelectionResult { Warehouse = warehouse });

        // Setup days override via WarehouseProviderConfig
        _warehouseProviderConfigServiceMock
            .Setup(x => x.GetByWarehouseAsync(warehouseId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<WarehouseProviderConfig>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    WarehouseId = warehouseId,
                    ProviderKey = "fedex",
                    IsEnabled = true,
                    DefaultDaysFromOverride = 2,
                    DefaultDaysToOverride = 4
                }
            });

        // Setup dynamic quote response
        _shippingQuoteServiceMock
            .Setup(x => x.GetQuotesForWarehouseAsync(
                It.Is<GetWarehouseQuotesParameters>(p => p.WarehouseId == warehouseId),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<ShippingRateQuote>
            {
                new()
                {
                    ProviderKey = "fedex",
                    ProviderName = "FedEx",
                    Metadata = new ShippingProviderMetadata
                    {
                        Key = "fedex",
                        DisplayName = "FedEx",
                        ConfigCapabilities = new ProviderConfigCapabilities { UsesLiveRates = true }
                    },
                    ServiceLevels = new[]
                    {
                        new ShippingServiceLevel
                        {
                            ServiceCode = "FEDEX_GROUND",
                            ServiceName = "FedEx Ground",
                            TotalCost = 12.99m,
                            CurrencyCode = "USD",
                            TransitTime = TimeSpan.FromDays(5) // Would normally be 5/6 days
                        }
                    }
                }
            });

        // Act
        var result = await _strategy.GroupItemsAsync(context);

        // Assert
        result.Success.ShouldBeTrue();
        result.Groups.Count.ShouldBe(1);

        // Should have both flat-rate and dynamic options
        var dynamicOption = result.Groups[0].AvailableShippingOptions
            .FirstOrDefault(o => o.ProviderKey == "fedex" && o.ServiceCode == "FEDEX_GROUND");
        dynamicOption.ShouldNotBeNull();
        dynamicOption.DaysFrom.ShouldBe(2); // Override applied (not 5)
        dynamicOption.DaysTo.ShouldBe(4); // Override applied (not 6)
        dynamicOption.Cost.ShouldBe(12.99m);
    }

    [Fact]
    public async Task GroupItemsAsync_DynamicProvider_NoDaysOverride_UsesCarrierTransitTime()
    {
        // Arrange
        var warehouseId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var shippingOptionId = Guid.NewGuid();

        var warehouse = CreateWarehouse(warehouseId, "Main Warehouse", shippingOptionId);
        var product = CreateProduct(productId, warehouse);
        product.PackageConfigurations = [new ProductPackage { Weight = 1.5m, LengthCm = 30, WidthCm = 20, HeightCm = 10 }];
        product.ProductRoot!.AllowExternalCarrierShipping = true;

        var lineItems = new List<LineItem>
        {
            CreateLineItem(productId, quantity: 1, amount: 50m)
        };

        var context = CreateContext(
            products: new Dictionary<Guid, Product> { [productId] = product },
            warehouses: new Dictionary<Guid, Warehouse> { [warehouseId] = warehouse },
            lineItems: lineItems,
            countryCode: "GB");

        _warehouseServiceMock
            .Setup(x => x.SelectWarehouseForProduct(
                It.IsAny<SelectWarehouseForProductParameters>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WarehouseSelectionResult { Warehouse = warehouse });

        // No days override configured
        _warehouseProviderConfigServiceMock
            .Setup(x => x.GetByWarehouseAsync(warehouseId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<WarehouseProviderConfig>());

        // Setup dynamic quote response with 3-day transit
        _shippingQuoteServiceMock
            .Setup(x => x.GetQuotesForWarehouseAsync(
                It.Is<GetWarehouseQuotesParameters>(p => p.WarehouseId == warehouseId),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<ShippingRateQuote>
            {
                new()
                {
                    ProviderKey = "ups",
                    ProviderName = "UPS",
                    Metadata = new ShippingProviderMetadata
                    {
                        Key = "ups",
                        DisplayName = "UPS",
                        ConfigCapabilities = new ProviderConfigCapabilities { UsesLiveRates = true }
                    },
                    ServiceLevels = new[]
                    {
                        new ShippingServiceLevel
                        {
                            ServiceCode = "03",
                            ServiceName = "UPS Ground",
                            TotalCost = 9.50m,
                            CurrencyCode = "USD",
                            TransitTime = TimeSpan.FromDays(3)
                        }
                    }
                }
            });

        // Act
        var result = await _strategy.GroupItemsAsync(context);

        // Assert
        result.Success.ShouldBeTrue();
        var dynamicOption = result.Groups[0].AvailableShippingOptions
            .FirstOrDefault(o => o.ProviderKey == "ups" && o.ServiceCode == "03");
        dynamicOption.ShouldNotBeNull();
        dynamicOption.DaysFrom.ShouldBe(3); // Ceiling of 3 days transit
        dynamicOption.DaysTo.ShouldBe(4);   // Ceiling of 3 days + 1
    }

    [Fact]
    public async Task GroupItemsAsync_FlatRateCost_IncludesGroupedWeightFromPackagesAndAddons()
    {
        // Arrange
        var warehouseId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var shippingOptionId = Guid.NewGuid();

        var warehouse = CreateWarehouse(warehouseId, "Main Warehouse", shippingOptionId);
        var product = CreateProduct(productId, warehouse);
        product.PackageConfigurations =
        [
            new ProductPackage { Weight = 2m, LengthCm = 20m, WidthCm = 20m, HeightCm = 10m }
        ];

        var productLineItem = CreateLineItem(productId, quantity: 1, amount: 50m);
        productLineItem.Sku = "TEST-SKU";

        var addonLineItem = LineItemFactory.CreateCustomLineItem(
            Guid.Empty,
            "Gift Wrap",
            "ADDON-GW",
            amount: 2m,
            cost: 0m,
            quantity: 1,
            isTaxable: false,
            taxRate: 0m);
        addonLineItem.LineItemType = LineItemType.Addon;
        addonLineItem.DependantLineItemSku = productLineItem.Sku;
        addonLineItem.SetParentLineItemId(productLineItem.Id);
        addonLineItem.ExtendedData["WeightKg"] = 1m;

        var context = CreateContext(
            products: new Dictionary<Guid, Product> { [productId] = product },
            warehouses: new Dictionary<Guid, Warehouse> { [warehouseId] = warehouse },
            lineItems: [productLineItem, addonLineItem],
            countryCode: "GB");

        _warehouseServiceMock
            .Setup(x => x.SelectWarehouseForProduct(
                It.IsAny<SelectWarehouseForProductParameters>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WarehouseSelectionResult { Warehouse = warehouse });

        // Base cost + surcharge when grouped weight reaches 3kg.
        _shippingCostResolverMock
            .Setup(x => x.GetTotalShippingCost(
                It.IsAny<ShippingOption>(),
                It.IsAny<string>(),
                It.IsAny<string?>(),
                It.IsAny<decimal?>()))
            .Returns((ShippingOption so, string _, string? __, decimal? weightKg) =>
            {
                var baseCost = so.FixedCost ?? 0m;
                if (!weightKg.HasValue || weightKg.Value < 3m)
                {
                    return baseCost;
                }

                return baseCost + 5m;
            });

        // Act
        var result = await _strategy.GroupItemsAsync(context);

        // Assert
        result.Success.ShouldBeTrue();
        result.Groups.Count.ShouldBe(1);
        result.Groups[0].AvailableShippingOptions.Count.ShouldBe(1);
        result.Groups[0].AvailableShippingOptions[0].Cost.ShouldBe(10.99m);
    }

    [Fact]
    public async Task GroupItemsAsync_DynamicProvider_PackageBuild_IncludesAddonWeight()
    {
        // Arrange
        var warehouseId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var shippingOptionId = Guid.NewGuid();

        var warehouse = CreateWarehouse(warehouseId, "Main Warehouse", shippingOptionId);
        var product = CreateProduct(productId, warehouse);
        product.PackageConfigurations =
        [
            new ProductPackage { Weight = 2m, LengthCm = 20m, WidthCm = 20m, HeightCm = 10m }
        ];
        product.ProductRoot!.AllowExternalCarrierShipping = true;

        var productLineItem = CreateLineItem(productId, quantity: 1, amount: 50m);
        productLineItem.Sku = "TEST-SKU";

        var addonLineItem = LineItemFactory.CreateCustomLineItem(
            Guid.Empty,
            "Gift Wrap",
            "ADDON-GW",
            amount: 2m,
            cost: 0m,
            quantity: 1,
            isTaxable: false,
            taxRate: 0m);
        addonLineItem.LineItemType = LineItemType.Addon;
        addonLineItem.DependantLineItemSku = productLineItem.Sku;
        addonLineItem.SetParentLineItemId(productLineItem.Id);
        addonLineItem.ExtendedData["WeightKg"] = 1m;

        var context = CreateContext(
            products: new Dictionary<Guid, Product> { [productId] = product },
            warehouses: new Dictionary<Guid, Warehouse> { [warehouseId] = warehouse },
            lineItems: [productLineItem, addonLineItem],
            countryCode: "GB");

        _warehouseServiceMock
            .Setup(x => x.SelectWarehouseForProduct(
                It.IsAny<SelectWarehouseForProductParameters>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WarehouseSelectionResult { Warehouse = warehouse });

        IReadOnlyCollection<ShipmentPackage>? capturedPackages = null;

        _shippingQuoteServiceMock
            .Setup(x => x.GetQuotesForWarehouseAsync(
                It.IsAny<GetWarehouseQuotesParameters>(),
                It.IsAny<CancellationToken>()))
            .Callback<GetWarehouseQuotesParameters, CancellationToken>((parameters, _) =>
            {
                capturedPackages = parameters.Packages;
            })
            .ReturnsAsync([]);

        // Act
        var result = await _strategy.GroupItemsAsync(context);

        // Assert
        result.Success.ShouldBeTrue();
        capturedPackages.ShouldNotBeNull();
        capturedPackages!.Count.ShouldBe(1);
        capturedPackages.First().WeightKg.ShouldBe(3m);
    }

    [Fact]
    public async Task GroupItemsAsync_DynamicProvider_PackageBuild_MergesAddonWeightIntoFirstConfiguredPackage()
    {
        // Arrange
        var warehouseId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var shippingOptionId = Guid.NewGuid();

        var warehouse = CreateWarehouse(warehouseId, "Main Warehouse", shippingOptionId);
        var product = CreateProduct(productId, warehouse);
        product.PackageConfigurations =
        [
            new ProductPackage { Weight = 2m, LengthCm = 20m, WidthCm = 20m, HeightCm = 10m },
            new ProductPackage { Weight = 1m, LengthCm = 10m, WidthCm = 10m, HeightCm = 10m }
        ];
        product.ProductRoot!.AllowExternalCarrierShipping = true;

        var productLineItem = CreateLineItem(productId, quantity: 1, amount: 50m);
        productLineItem.Sku = "TEST-SKU";

        var addonLineItem = LineItemFactory.CreateCustomLineItem(
            Guid.Empty,
            "Gift Wrap",
            "ADDON-GW",
            amount: 2m,
            cost: 0m,
            quantity: 1,
            isTaxable: false,
            taxRate: 0m);
        addonLineItem.LineItemType = LineItemType.Addon;
        addonLineItem.DependantLineItemSku = productLineItem.Sku;
        addonLineItem.SetParentLineItemId(productLineItem.Id);
        addonLineItem.ExtendedData["WeightKg"] = 0.5m;

        var context = CreateContext(
            products: new Dictionary<Guid, Product> { [productId] = product },
            warehouses: new Dictionary<Guid, Warehouse> { [warehouseId] = warehouse },
            lineItems: [productLineItem, addonLineItem],
            countryCode: "GB");

        _warehouseServiceMock
            .Setup(x => x.SelectWarehouseForProduct(
                It.IsAny<SelectWarehouseForProductParameters>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WarehouseSelectionResult { Warehouse = warehouse });

        IReadOnlyCollection<ShipmentPackage>? capturedPackages = null;

        _shippingQuoteServiceMock
            .Setup(x => x.GetQuotesForWarehouseAsync(
                It.IsAny<GetWarehouseQuotesParameters>(),
                It.IsAny<CancellationToken>()))
            .Callback<GetWarehouseQuotesParameters, CancellationToken>((parameters, _) =>
            {
                capturedPackages = parameters.Packages;
            })
            .ReturnsAsync([]);

        // Act
        var result = await _strategy.GroupItemsAsync(context);

        // Assert
        result.Success.ShouldBeTrue();
        capturedPackages.ShouldNotBeNull();
        capturedPackages!.Count.ShouldBe(2);
        capturedPackages.ElementAt(0).WeightKg.ShouldBe(2.5m);
        capturedPackages.ElementAt(1).WeightKg.ShouldBe(1m);
    }

    private static OrderGroupingContext CreateContext(
        Dictionary<Guid, Product>? products = null,
        Dictionary<Guid, Warehouse>? warehouses = null,
        List<LineItem>? lineItems = null,
        string countryCode = "GB")
    {
        var basketFactory = new BasketFactory();
        var addressFactory = new AddressFactory();
        var basket = basketFactory.Create(null, "USD", "$");
        basket.LineItems = lineItems ?? [];
        basket.SubTotal = 100m;
        basket.Tax = 20m;
        basket.Total = 120m;

        return new OrderGroupingContext
        {
            Basket = basket,
            BillingAddress = addressFactory.CreateFromFormData(
                firstName: "Test",
                lastName: "User",
                address1: "123 Main St",
                address2: null,
                city: "London",
                postalCode: "SW1A 1AA",
                countryCode: countryCode,
                regionCode: null,
                phone: null,
                email: "test@example.com"),
            ShippingAddress = addressFactory.CreateFromFormData(
                firstName: "Test",
                lastName: "User",
                address1: "123 Main St",
                address2: null,
                city: "London",
                postalCode: "SW1A 1AA",
                countryCode: countryCode,
                regionCode: null,
                phone: null,
                email: "test@example.com"),
            Products = products ?? new Dictionary<Guid, Product>(),
            Warehouses = warehouses ?? new Dictionary<Guid, Warehouse>()
        };
    }

    private static LineItem CreateLineItem(Guid productId, int quantity = 1, decimal amount = 50m)
    {
        var lineItem = LineItemFactory.CreateCustomLineItem(
            Guid.Empty,
            "Test Product",
            "TEST-SKU",
            amount,
            cost: 0m,
            quantity: quantity,
            isTaxable: false,
            taxRate: 0m);
        lineItem.LineItemType = LineItemType.Product;
        lineItem.ProductId = productId;
        lineItem.OrderId = null;
        return lineItem;
    }

    private static Warehouse CreateWarehouse(Guid id, string name, Guid shippingOptionId)
    {
        var addressFactory = new AddressFactory();
        var warehouseFactory = new WarehouseFactory();
        var shippingOptionFactory = new ShippingOptionFactory();

        var address = addressFactory.CreateFromFormData(
            firstName: "Warehouse",
            lastName: "Address",
            address1: "1 Depot Way",
            address2: null,
            city: "London",
            postalCode: "SW1A 1AA",
            countryCode: "GB",
            regionCode: null,
            phone: null,
            email: null);

        var warehouse = warehouseFactory.Create(name, address);
        warehouse.Id = id;

        var option = shippingOptionFactory.Create(
            "Standard Delivery",
            5.99m,
            warehouse,
            daysFrom: 3,
            daysTo: 5,
            isNextDay: false,
            nextDayCutOffTime: null);
        option.Id = shippingOptionId;
        option.WarehouseId = warehouse.Id;

        warehouse.ShippingOptions = [option];
        return warehouse;
    }

    private static Product CreateProduct(Guid id, Warehouse? warehouse)
    {
        var taxGroupFactory = new TaxGroupFactory();
        var productTypeFactory = new ProductTypeFactory();
        var productRootFactory = new ProductRootFactory();
        var productFactory = new ProductFactory(new SlugHelper());

        var taxGroup = taxGroupFactory.Create("Standard VAT", 20m);
        taxGroup.Id = Guid.NewGuid();
        var productType = productTypeFactory.Create("Default", "default");
        productType.Id = Guid.NewGuid();

        var productRoot = productRootFactory.Create(
            "Test Product",
            taxGroup,
            productType,
            []);
        productRoot.Id = Guid.NewGuid();

        var product = productFactory.Create(
            productRoot,
            "Test Product",
            50m,
            costOfGoods: 0m,
            gtin: string.Empty,
            sku: "TEST-SKU",
            isDefault: true);
        product.Id = id;
        product.ProductRootId = productRoot.Id;
        product.ShippingOptions = warehouse?.ShippingOptions.ToList() ?? [];
        return product;
    }
}
