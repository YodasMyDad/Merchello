using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Strategies;
using Merchello.Core.Checkout.Strategies.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Warehouses.Models;
using Merchello.Core.Notifications.Interfaces;
using Umbraco.Cms.Core.Notifications;
using Merchello.Core.Warehouses.Services.Interfaces;
using Merchello.Core.Warehouses.Services.Parameters;
using Microsoft.Extensions.Logging;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Checkout.Strategies;

public class DefaultOrderGroupingStrategyTests
{
    private readonly Mock<IWarehouseService> _warehouseServiceMock;
    private readonly Mock<IShippingCostResolver> _shippingCostResolverMock;
    private readonly Mock<IShippingQuoteService> _shippingQuoteServiceMock;
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
        _shippingQuoteServiceMock = new Mock<IShippingQuoteService>();
        _warehouseProviderConfigServiceMock = new Mock<IWarehouseProviderConfigService>();
        _notificationPublisherMock = new Mock<IMerchelloNotificationPublisher>();
        _notificationPublisherMock
            .Setup(p => p.PublishCancelableAsync(It.IsAny<ICancelableNotification>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _loggerMock = new Mock<ILogger<DefaultOrderGroupingStrategy>>();
        _strategy = new DefaultOrderGroupingStrategy(
            _warehouseServiceMock.Object,
            _shippingCostResolverMock.Object,
            _shippingQuoteServiceMock.Object,
            _warehouseProviderConfigServiceMock.Object,
            _notificationPublisherMock.Object,
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
    public async Task GroupItemsAsync_DynamicProvider_AppliesDaysOverride_FromWarehouseConfig()
    {
        // Arrange
        var warehouseId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var shippingOptionId = Guid.NewGuid();

        var warehouse = CreateWarehouse(warehouseId, "Main Warehouse", shippingOptionId);
        var product = CreateProduct(productId, warehouse);
        product.PackageConfigurations = [new ProductPackage { Weight = 1.5m, LengthCm = 30, WidthCm = 20, HeightCm = 10 }];
        product.ProductRoot = new ProductRoot
        {
            Id = Guid.NewGuid(),
            RootName = "Test Product",
            AllowExternalCarrierShipping = true
        };

        var lineItemId = Guid.NewGuid();
        var lineItems = new List<LineItem>
        {
            new()
            {
                Id = lineItemId,
                ProductId = productId,
                Name = "Test Product",
                Sku = "TEST-SKU",
                Quantity = 1,
                Amount = 50m
            }
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
                warehouseId,
                It.IsAny<Address>(),
                It.IsAny<IReadOnlyCollection<ShipmentPackage>>(),
                It.IsAny<string>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<string>(),
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
        product.ProductRoot = new ProductRoot
        {
            Id = Guid.NewGuid(),
            RootName = "Test Product",
            AllowExternalCarrierShipping = true
        };

        var lineItems = new List<LineItem>
        {
            new()
            {
                Id = Guid.NewGuid(),
                ProductId = productId,
                Name = "Test Product",
                Sku = "TEST-SKU",
                Quantity = 1,
                Amount = 50m
            }
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
                warehouseId,
                It.IsAny<Address>(),
                It.IsAny<IReadOnlyCollection<ShipmentPackage>>(),
                It.IsAny<string>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<string>(),
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

    private static OrderGroupingContext CreateContext(
        Dictionary<Guid, Product>? products = null,
        Dictionary<Guid, Warehouse>? warehouses = null,
        List<LineItem>? lineItems = null,
        string countryCode = "GB")
    {
        return new OrderGroupingContext
        {
            Basket = new Basket
            {
                Id = Guid.NewGuid(),
                LineItems = lineItems ?? [],
                SubTotal = 100m,
                Tax = 20m,
                Total = 120m
            },
            BillingAddress = new Address(),
            ShippingAddress = new Address
            {
                CountryCode = countryCode
            },
            Products = products ?? new Dictionary<Guid, Product>(),
            Warehouses = warehouses ?? new Dictionary<Guid, Warehouse>()
        };
    }

    private static LineItem CreateLineItem(Guid productId, int quantity = 1, decimal amount = 50m)
    {
        return new LineItem
        {
            Id = Guid.NewGuid(),
            ProductId = productId,
            Name = "Test Product",
            Sku = "TEST-SKU",
            Quantity = quantity,
            Amount = amount
        };
    }

    private static Warehouse CreateWarehouse(Guid id, string name, Guid shippingOptionId)
    {
        return new Warehouse
        {
            Id = id,
            Name = name,
            ShippingOptions =
            [
                new()
                {
                    Id = shippingOptionId,
                    Name = "Standard Delivery",
                    DaysFrom = 3,
                    DaysTo = 5,
                    FixedCost = 5.99m
                }
            ]
        };
    }

    private static Product CreateProduct(Guid id, Warehouse? warehouse)
    {
        var product = new Product
        {
            Id = id,
            Name = "Test Product",
            Sku = "TEST-SKU",
            Price = 50m,
            ShippingOptions = warehouse?.ShippingOptions.ToList() ?? []
        };
        return product;
    }
}

