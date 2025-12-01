using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Data;
using Merchello.Core.Locality.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Services;
using Merchello.Core.Warehouses.Factories;
using Merchello.Core.Warehouses.Models;
using Merchello.Core.Warehouses.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;

namespace Merchello.Tests.Shipping;

public class ShippingServiceTests : IClassFixture<ServiceTestFixture>
{
    private readonly IMerchDbContext _dbContext;
    private readonly WarehouseFactory _warehouseFactory;
    private readonly Mock<ILogger<WarehouseService>> _warehouseLoggerMock;
    private readonly Mock<ILogger<ShippingService>> _shippingLoggerMock;

    public ShippingServiceTests(ServiceTestFixture fixture)
    {
        fixture.ResetDatabase();
        _dbContext = fixture.DbContext;
        _warehouseFactory = new WarehouseFactory();
        _warehouseLoggerMock = new Mock<ILogger<WarehouseService>>();
        _shippingLoggerMock = new Mock<ILogger<ShippingService>>();
    }

    [Fact]
    public async Task GetShippingOptionsForBasket_WithValidBasket_ReturnsWarehouseGroups()
    {
        // Arrange
        var (product, warehouse) = await CreateProductWithWarehouse();
        var warehouseService = new WarehouseService(_dbContext, _warehouseFactory, _warehouseLoggerMock.Object);
        var shippingService = new ShippingService(_dbContext, warehouseService, _shippingLoggerMock.Object);

        await warehouseService.SetProductStock(product.Id, warehouse.Id, 100);

        var basket = new Basket
        {
            SubTotal = 50m,
            Tax = 10m,
            Total = 60m
        };
        basket.LineItems.Add(new LineItem
        {
            ProductId = product.Id,
            Name = product.Name,
            Sku = "TEST-SKU",
            Quantity = 2,
            Amount = 25m
        });

        var shippingAddress = new Address { CountryCode = "GB" };

        // Act
        var result = await shippingService.GetShippingOptionsForBasket(basket, shippingAddress);

        // Assert
        Assert.NotNull(result);
        Assert.Single(result.WarehouseGroups);
        Assert.Equal(warehouse.Id, result.WarehouseGroups[0].WarehouseId);
        Assert.Single(result.WarehouseGroups[0].LineItems);
        Assert.Equal(50m, result.SubTotal);
        Assert.Equal(10m, result.Tax);
        Assert.Equal(60m, result.Total);
    }

    [Fact]
    public async Task GetShippingOptionsForBasket_WithEmptyCountryCode_ReturnsEmptyGroups()
    {
        // Arrange
        var warehouseService = new WarehouseService(_dbContext, _warehouseFactory, _warehouseLoggerMock.Object);
        var shippingService = new ShippingService(_dbContext, warehouseService, _shippingLoggerMock.Object);

        var basket = new Basket { SubTotal = 50m, Tax = 10m, Total = 60m };
        basket.LineItems.Add(new LineItem { ProductId = Guid.NewGuid(), Name = "Test", Quantity = 1, Amount = 50m });

        var shippingAddress = new Address { CountryCode = "" };

        // Act
        var result = await shippingService.GetShippingOptionsForBasket(basket, shippingAddress);

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result.WarehouseGroups);
    }

    [Fact]
    public async Task GetShippingOptionsForBasket_WithMultipleWarehouses_GroupsCorrectly()
    {
        // Arrange
        var (product1, warehouse1) = await CreateProductWithWarehouse("Product 1", "Warehouse 1");
        var (product2, warehouse2) = await CreateProductWithWarehouse("Product 2", "Warehouse 2");

        var warehouseService = new WarehouseService(_dbContext, _warehouseFactory, _warehouseLoggerMock.Object);
        var shippingService = new ShippingService(_dbContext, warehouseService, _shippingLoggerMock.Object);

        await warehouseService.SetProductStock(product1.Id, warehouse1.Id, 100);
        await warehouseService.SetProductStock(product2.Id, warehouse2.Id, 50);

        var basket = new Basket();
        basket.LineItems.Add(new LineItem
        {
            ProductId = product1.Id,
            Name = product1.Name,
            Sku = "SKU1",
            Quantity = 2,
            Amount = 25m
        });
        basket.LineItems.Add(new LineItem
        {
            ProductId = product2.Id,
            Name = product2.Name,
            Sku = "SKU2",
            Quantity = 1,
            Amount = 30m
        });

        var shippingAddress = new Address { CountryCode = "GB" };

        // Act
        var result = await shippingService.GetShippingOptionsForBasket(basket, shippingAddress);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.WarehouseGroups.Count);

        var group1 = result.WarehouseGroups.FirstOrDefault(g => g.WarehouseId == warehouse1.Id);
        var group2 = result.WarehouseGroups.FirstOrDefault(g => g.WarehouseId == warehouse2.Id);

        Assert.NotNull(group1);
        Assert.NotNull(group2);
        Assert.Single(group1!.LineItems);
        Assert.Single(group2!.LineItems);
    }

    [Fact]
    public async Task GetShippingOptionsForBasket_WithProductNotFound_CompletesWithoutError()
    {
        // Arrange
        var warehouseService = new WarehouseService(_dbContext, _warehouseFactory, _warehouseLoggerMock.Object);
        var shippingService = new ShippingService(_dbContext, warehouseService, _shippingLoggerMock.Object);

        var basket = new Basket();
        basket.LineItems.Add(new LineItem
        {
            ProductId = Guid.NewGuid(), // Non-existent product
            Name = "Ghost Product",
            Sku = "GHOST",
            Quantity = 1,
            Amount = 50m
        });

        var shippingAddress = new Address { CountryCode = "GB" };

        // Act
        var result = await shippingService.GetShippingOptionsForBasket(basket, shippingAddress);

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result.WarehouseGroups); // Product not found, no warehouse assigned
    }

    [Fact]
    public async Task GetShippingOptionsForBasket_WithAllowedShippingRestrictions_FiltersCorrectly()
    {
        // Arrange
        var (product, warehouse) = await CreateProductWithWarehouse();

        var shippingOption1 = new ShippingOption
        {
            Id = Guid.NewGuid(),
            Name = "Standard Delivery",
            WarehouseId = warehouse.Id,
            DaysFrom = 2,
            DaysTo = 5,
            FixedCost = 5m
        };
        var shippingOption2 = new ShippingOption
        {
            Id = Guid.NewGuid(),
            Name = "Express Delivery",
            WarehouseId = warehouse.Id,
            DaysFrom = 1,
            DaysTo = 1,
            FixedCost = 10m,
            IsNextDay = true
        };

        warehouse.ShippingOptions.Add(shippingOption1);
        warehouse.ShippingOptions.Add(shippingOption2);
        _dbContext.ShippingOptions.Add(shippingOption1);
        _dbContext.ShippingOptions.Add(shippingOption2);

        // Set product to allow only Standard Delivery
        product.ShippingRestrictionMode = ShippingRestrictionMode.AllowList;
        product.AllowedShippingOptions.Add(shippingOption1);

        await _dbContext.SaveChangesAsync();

        var warehouseService = new WarehouseService(_dbContext, _warehouseFactory, _warehouseLoggerMock.Object);
        var shippingService = new ShippingService(_dbContext, warehouseService, _shippingLoggerMock.Object);

        await warehouseService.SetProductStock(product.Id, warehouse.Id, 100);

        var basket = new Basket();
        basket.LineItems.Add(new LineItem
        {
            ProductId = product.Id,
            Name = product.Name,
            Sku = "SKU1",
            Quantity = 1,
            Amount = 25m
        });

        var shippingAddress = new Address { CountryCode = "GB" };

        // Act
        var result = await shippingService.GetShippingOptionsForBasket(basket, shippingAddress);

        // Assert
        Assert.NotNull(result);
        Assert.Single(result.WarehouseGroups);
        var group = result.WarehouseGroups[0];
        Assert.Single(group.AvailableShippingOptions);
        Assert.Equal("Standard Delivery", group.AvailableShippingOptions[0].Name);
    }

    [Fact]
    public async Task GetShippingOptionsForBasket_WithExcludedShippingRestrictions_FiltersCorrectly()
    {
        // Arrange
        var (product, warehouse) = await CreateProductWithWarehouse();

        var shippingOption1 = new ShippingOption
        {
            Id = Guid.NewGuid(),
            Name = "Standard Delivery",
            WarehouseId = warehouse.Id,
            DaysFrom = 2,
            DaysTo = 5,
            FixedCost = 5m
        };
        var shippingOption2 = new ShippingOption
        {
            Id = Guid.NewGuid(),
            Name = "Express Delivery",
            WarehouseId = warehouse.Id,
            DaysFrom = 1,
            DaysTo = 1,
            FixedCost = 10m,
            IsNextDay = true
        };

        warehouse.ShippingOptions.Add(shippingOption1);
        warehouse.ShippingOptions.Add(shippingOption2);
        _dbContext.ShippingOptions.Add(shippingOption1);
        _dbContext.ShippingOptions.Add(shippingOption2);

        // Set product to exclude Express Delivery
        product.ShippingRestrictionMode = ShippingRestrictionMode.ExcludeList;
        product.ExcludedShippingOptions.Add(shippingOption2);

        await _dbContext.SaveChangesAsync();

        var warehouseService = new WarehouseService(_dbContext, _warehouseFactory, _warehouseLoggerMock.Object);
        var shippingService = new ShippingService(_dbContext, warehouseService, _shippingLoggerMock.Object);

        await warehouseService.SetProductStock(product.Id, warehouse.Id, 100);

        var basket = new Basket();
        basket.LineItems.Add(new LineItem
        {
            ProductId = product.Id,
            Name = product.Name,
            Sku = "SKU1",
            Quantity = 1,
            Amount = 25m
        });

        var shippingAddress = new Address { CountryCode = "GB" };

        // Act
        var result = await shippingService.GetShippingOptionsForBasket(basket, shippingAddress);

        // Assert
        Assert.NotNull(result);
        Assert.Single(result.WarehouseGroups);
        var group = result.WarehouseGroups[0];
        Assert.Single(group.AvailableShippingOptions);
        Assert.Equal("Standard Delivery", group.AvailableShippingOptions[0].Name);
    }

    [Fact]
    public async Task GetShippingOptionsForBasket_WithCommonShippingOptions_IntersectsCorrectly()
    {
        // Arrange
        var productRoot = CreateProductRoot();
        var warehouse = CreateWarehouse("Main Warehouse");

        var shippingOption1 = new ShippingOption
        {
            Id = Guid.NewGuid(),
            Name = "Standard",
            WarehouseId = warehouse.Id,
            DaysFrom = 2,
            DaysTo = 5,
            FixedCost = 5m
        };
        var shippingOption2 = new ShippingOption
        {
            Id = Guid.NewGuid(),
            Name = "Express",
            WarehouseId = warehouse.Id,
            DaysFrom = 1,
            DaysTo = 1,
            FixedCost = 10m
        };

        warehouse.ShippingOptions.Add(shippingOption1);
        warehouse.ShippingOptions.Add(shippingOption2);
        _dbContext.ShippingOptions.Add(shippingOption1);
        _dbContext.ShippingOptions.Add(shippingOption2);

        // Product 1 allows only Standard
        var product1 = CreateProduct("Product 1", productRoot);
        product1.ShippingRestrictionMode = ShippingRestrictionMode.AllowList;
        product1.AllowedShippingOptions.Add(shippingOption1);

        // Product 2 has no restrictions (both allowed)
        var product2 = CreateProduct("Product 2", productRoot);
        product2.ShippingRestrictionMode = ShippingRestrictionMode.None;

        AddWarehouseToProductRoot(productRoot, warehouse, 1);

        // Save all entities to database
        await _dbContext.SaveChangesAsync();

        var warehouseService = new WarehouseService(_dbContext, _warehouseFactory, _warehouseLoggerMock.Object);
        var shippingService = new ShippingService(_dbContext, warehouseService, _shippingLoggerMock.Object);

        await warehouseService.SetProductStock(product1.Id, warehouse.Id, 100);
        await warehouseService.SetProductStock(product2.Id, warehouse.Id, 50);

        var basket = new Basket();
        basket.LineItems.Add(new LineItem { ProductId = product1.Id, Name = product1.Name, Sku = "SKU1", Quantity = 1, Amount = 10m });
        basket.LineItems.Add(new LineItem { ProductId = product2.Id, Name = product2.Name, Sku = "SKU2", Quantity = 1, Amount = 20m });

        var shippingAddress = new Address { CountryCode = "GB" };

        // Act
        var result = await shippingService.GetShippingOptionsForBasket(basket, shippingAddress);

        // Assert - Should split products into separate groups based on shipping restrictions
        // Product 1 only allows "Standard", Product 2 allows both
        // Should create 2 groups from the same warehouse
        Assert.NotNull(result);
        Assert.Equal(2, result.WarehouseGroups.Count);

        // Both groups should be from the same warehouse
        Assert.All(result.WarehouseGroups, g => Assert.Equal(warehouse.Id, g.WarehouseId));

        // Find the group with Product 1 (restricted to Standard only)
        var restrictedGroup = result.WarehouseGroups.First(g =>
            g.LineItems.Any(li => li.Name == "Product 1"));
        Assert.Single(restrictedGroup.LineItems);
        Assert.Single(restrictedGroup.AvailableShippingOptions);
        Assert.Equal("Standard", restrictedGroup.AvailableShippingOptions[0].Name);

        // Find the group with Product 2 (allows both options)
        var unrestrictedGroup = result.WarehouseGroups.First(g =>
            g.LineItems.Any(li => li.Name == "Product 2"));
        Assert.Single(unrestrictedGroup.LineItems);
        Assert.Equal(2, unrestrictedGroup.AvailableShippingOptions.Count);
        Assert.Contains(unrestrictedGroup.AvailableShippingOptions, so => so.Name == "Standard");
        Assert.Contains(unrestrictedGroup.AvailableShippingOptions, so => so.Name == "Express");
    }

    [Fact]
    public async Task GetShippingOptionsForBasket_ProductsWithSameRestrictions_GroupedTogether()
    {
        // Arrange
        var productRoot = CreateProductRoot();
        var warehouse = CreateWarehouse("Main Warehouse");

        var shippingOption1 = new ShippingOption
        {
            Id = Guid.NewGuid(),
            Name = "Standard",
            WarehouseId = warehouse.Id,
            DaysFrom = 2,
            DaysTo = 5,
            FixedCost = 5m
        };

        warehouse.ShippingOptions.Add(shippingOption1);
        _dbContext.ShippingOptions.Add(shippingOption1);

        // Both products have the same restriction - allow only Standard
        var product1 = CreateProduct("Product 1", productRoot);
        product1.ShippingRestrictionMode = ShippingRestrictionMode.AllowList;
        product1.AllowedShippingOptions.Add(shippingOption1);

        var product2 = CreateProduct("Product 2", productRoot);
        product2.ShippingRestrictionMode = ShippingRestrictionMode.AllowList;
        product2.AllowedShippingOptions.Add(shippingOption1);

        AddWarehouseToProductRoot(productRoot, warehouse, 1);
        await _dbContext.SaveChangesAsync();

        var warehouseService = new WarehouseService(_dbContext, _warehouseFactory, _warehouseLoggerMock.Object);
        var shippingService = new ShippingService(_dbContext, warehouseService, _shippingLoggerMock.Object);

        await warehouseService.SetProductStock(product1.Id, warehouse.Id, 100);
        await warehouseService.SetProductStock(product2.Id, warehouse.Id, 50);

        var basket = new Basket();
        basket.LineItems.Add(new LineItem { ProductId = product1.Id, Name = product1.Name, Sku = "SKU1", Quantity = 1, Amount = 10m });
        basket.LineItems.Add(new LineItem { ProductId = product2.Id, Name = product2.Name, Sku = "SKU2", Quantity = 1, Amount = 20m });

        var shippingAddress = new Address { CountryCode = "GB" };

        // Act
        var result = await shippingService.GetShippingOptionsForBasket(basket, shippingAddress);

        // Assert - Products with same restrictions should be in ONE group (can ship together)
        Assert.NotNull(result);
        Assert.Single(result.WarehouseGroups);
        var group = result.WarehouseGroups[0];
        Assert.Equal(warehouse.Id, group.WarehouseId);
        Assert.Equal(2, group.LineItems.Count); // Both products in same group
        Assert.Single(group.AvailableShippingOptions);
        Assert.Equal("Standard", group.AvailableShippingOptions[0].Name);
    }

    [Fact]
    public async Task GetShippingOptionsForBasket_ProductsWithConflictingRestrictions_SeparateGroups()
    {
        // Arrange
        var productRoot = CreateProductRoot();
        var warehouse = CreateWarehouse("Main Warehouse");

        var shippingOption1 = new ShippingOption
        {
            Id = Guid.NewGuid(),
            Name = "Standard",
            WarehouseId = warehouse.Id,
            DaysFrom = 2,
            DaysTo = 5,
            FixedCost = 5m
        };
        var shippingOption2 = new ShippingOption
        {
            Id = Guid.NewGuid(),
            Name = "Express",
            WarehouseId = warehouse.Id,
            DaysFrom = 1,
            DaysTo = 1,
            FixedCost = 10m
        };

        warehouse.ShippingOptions.Add(shippingOption1);
        warehouse.ShippingOptions.Add(shippingOption2);
        _dbContext.ShippingOptions.Add(shippingOption1);
        _dbContext.ShippingOptions.Add(shippingOption2);

        // Product 1 allows ONLY Standard
        var product1 = CreateProduct("Product 1", productRoot);
        product1.ShippingRestrictionMode = ShippingRestrictionMode.AllowList;
        product1.AllowedShippingOptions.Add(shippingOption1);

        // Product 2 allows ONLY Express (conflicting with Product 1)
        var product2 = CreateProduct("Product 2", productRoot);
        product2.ShippingRestrictionMode = ShippingRestrictionMode.AllowList;
        product2.AllowedShippingOptions.Add(shippingOption2);

        AddWarehouseToProductRoot(productRoot, warehouse, 1);
        await _dbContext.SaveChangesAsync();

        var warehouseService = new WarehouseService(_dbContext, _warehouseFactory, _warehouseLoggerMock.Object);
        var shippingService = new ShippingService(_dbContext, warehouseService, _shippingLoggerMock.Object);

        await warehouseService.SetProductStock(product1.Id, warehouse.Id, 100);
        await warehouseService.SetProductStock(product2.Id, warehouse.Id, 50);

        var basket = new Basket();
        basket.LineItems.Add(new LineItem { ProductId = product1.Id, Name = product1.Name, Sku = "SKU1", Quantity = 1, Amount = 10m });
        basket.LineItems.Add(new LineItem { ProductId = product2.Id, Name = product2.Name, Sku = "SKU2", Quantity = 1, Amount = 20m });

        var shippingAddress = new Address { CountryCode = "GB" };

        // Act
        var result = await shippingService.GetShippingOptionsForBasket(basket, shippingAddress);

        // Assert - Conflicting restrictions must create 2 separate groups
        Assert.NotNull(result);
        Assert.Equal(2, result.WarehouseGroups.Count);

        // Both groups from same warehouse
        Assert.All(result.WarehouseGroups, g => Assert.Equal(warehouse.Id, g.WarehouseId));

        // Group 1: Standard only
        var standardGroup = result.WarehouseGroups.First(g =>
            g.AvailableShippingOptions.Any(so => so.Name == "Standard"));
        Assert.Single(standardGroup.LineItems);
        Assert.Single(standardGroup.AvailableShippingOptions);
        Assert.Equal("Standard", standardGroup.AvailableShippingOptions[0].Name);

        // Group 2: Express only
        var expressGroup = result.WarehouseGroups.First(g =>
            g.AvailableShippingOptions.Any(so => so.Name == "Express"));
        Assert.Single(expressGroup.LineItems);
        Assert.Single(expressGroup.AvailableShippingOptions);
        Assert.Equal("Express", expressGroup.AvailableShippingOptions[0].Name);
    }

    [Fact]
    public async Task GetShippingOptionsForBasket_WithSelectedOptions_PreservesSelection()
    {
        // Arrange
        var (product, warehouse) = await CreateProductWithWarehouse();
        var warehouseService = new WarehouseService(_dbContext, _warehouseFactory, _warehouseLoggerMock.Object);
        var shippingService = new ShippingService(_dbContext, warehouseService, _shippingLoggerMock.Object);

        await warehouseService.SetProductStock(product.Id, warehouse.Id, 100);

        var basket = new Basket();
        basket.LineItems.Add(new LineItem { ProductId = product.Id, Name = product.Name, Quantity = 1, Amount = 25m });

        var shippingAddress = new Address { CountryCode = "GB" };
        var selectedOptionId = Guid.NewGuid();
        var selectedOptions = new Dictionary<Guid, Guid> { { warehouse.Id, selectedOptionId } };

        // Act
        var result = await shippingService.GetShippingOptionsForBasket(basket, shippingAddress, selectedOptions);

        // Assert
        Assert.NotNull(result);
        Assert.Single(result.WarehouseGroups);
        Assert.Equal(selectedOptionId, result.WarehouseGroups[0].SelectedShippingOptionId);
    }

    [Fact]
    public async Task GetShippingSummaryForReview_WithValidSelections_ReturnsSummary()
    {
        // Arrange
        var (product, warehouse) = await CreateProductWithWarehouse();
        var shippingOption = new ShippingOption
        {
            Id = Guid.NewGuid(),
            Name = "Standard Delivery",
            WarehouseId = warehouse.Id,
            DaysFrom = 2,
            DaysTo = 5,
            FixedCost = 7.99m
        };

        _dbContext.ShippingOptions.Add(shippingOption);
        await _dbContext.SaveChangesAsync();

        var warehouseService = new WarehouseService(_dbContext, _warehouseFactory, _warehouseLoggerMock.Object);
        var shippingService = new ShippingService(_dbContext, warehouseService, _shippingLoggerMock.Object);

        await warehouseService.SetProductStock(product.Id, warehouse.Id, 100);

        var basket = new Basket();
        basket.LineItems.Add(new LineItem { ProductId = product.Id, Name = product.Name, Sku = "SKU", Quantity = 1, Amount = 25m });

        var shippingAddress = new Address { CountryCode = "GB" };
        var selectedOptions = new Dictionary<Guid, Guid> { { warehouse.Id, shippingOption.Id } };

        // Act
        var result = await shippingService.GetShippingSummaryForReview(basket, shippingAddress, selectedOptions);

        // Assert
        Assert.NotNull(result);
        Assert.Single(result.Shipments);
        Assert.Equal("Standard Delivery", result.Shipments[0].ShippingMethodName);
        Assert.Equal(7.99m, result.Shipments[0].ShippingCost);
        Assert.Equal(7.99m, result.TotalShippingCost);
        Assert.Equal("2-5 days", result.Shipments[0].DeliveryTimeDescription);
    }

    [Fact]
    public async Task GetShippingSummaryForReview_WithInvalidOptionId_SkipsWarehouse()
    {
        // Arrange
        var (product, warehouse) = await CreateProductWithWarehouse();
        var warehouseService = new WarehouseService(_dbContext, _warehouseFactory, _warehouseLoggerMock.Object);
        var shippingService = new ShippingService(_dbContext, warehouseService, _shippingLoggerMock.Object);

        await warehouseService.SetProductStock(product.Id, warehouse.Id, 100);

        var basket = new Basket();
        basket.LineItems.Add(new LineItem { ProductId = product.Id, Name = product.Name, Quantity = 1, Amount = 25m });

        var shippingAddress = new Address { CountryCode = "GB" };
        var selectedOptions = new Dictionary<Guid, Guid> { { warehouse.Id, Guid.NewGuid() } }; // Invalid ID

        // Act
        var result = await shippingService.GetShippingSummaryForReview(basket, shippingAddress, selectedOptions);

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result.Shipments); // Invalid option ID, shipment skipped
        Assert.Equal(0m, result.TotalShippingCost);
    }

    [Fact]
    public async Task GetShippingSummaryForReview_CalculatesTotalShippingCost()
    {
        // Arrange
        var (product1, warehouse1) = await CreateProductWithWarehouse("Product 1", "Warehouse 1");
        var (product2, warehouse2) = await CreateProductWithWarehouse("Product 2", "Warehouse 2");

        var shippingOption1 = new ShippingOption { Id = Guid.NewGuid(), Name = "Standard", WarehouseId = warehouse1.Id, DaysFrom = 2, DaysTo = 5, FixedCost = 5m };
        var shippingOption2 = new ShippingOption { Id = Guid.NewGuid(), Name = "Express", WarehouseId = warehouse2.Id, DaysFrom = 1, DaysTo = 2, FixedCost = 8m };

        _dbContext.ShippingOptions.Add(shippingOption1);
        _dbContext.ShippingOptions.Add(shippingOption2);
        await _dbContext.SaveChangesAsync();

        var warehouseService = new WarehouseService(_dbContext, _warehouseFactory, _warehouseLoggerMock.Object);
        var shippingService = new ShippingService(_dbContext, warehouseService, _shippingLoggerMock.Object);

        await warehouseService.SetProductStock(product1.Id, warehouse1.Id, 100);
        await warehouseService.SetProductStock(product2.Id, warehouse2.Id, 50);

        var basket = new Basket();
        basket.LineItems.Add(new LineItem { ProductId = product1.Id, Name = product1.Name, Quantity = 1, Amount = 20m });
        basket.LineItems.Add(new LineItem { ProductId = product2.Id, Name = product2.Name, Quantity = 1, Amount = 30m });

        var shippingAddress = new Address { CountryCode = "GB" };
        var selectedOptions = new Dictionary<Guid, Guid>
        {
            { warehouse1.Id, shippingOption1.Id },
            { warehouse2.Id, shippingOption2.Id }
        };

        // Act
        var result = await shippingService.GetShippingSummaryForReview(basket, shippingAddress, selectedOptions);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.Shipments.Count);
        Assert.Equal(13m, result.TotalShippingCost); // 5 + 8
    }

    [Fact]
    public async Task GetRequiredWarehouses_ReturnsUniqueWarehouseIds()
    {
        // Arrange
        var (product1, warehouse1) = await CreateProductWithWarehouse("Product 1", "Warehouse 1");
        var (product2, warehouse2) = await CreateProductWithWarehouse("Product 2", "Warehouse 1"); // Same warehouse

        var warehouseService = new WarehouseService(_dbContext, _warehouseFactory, _warehouseLoggerMock.Object);
        var shippingService = new ShippingService(_dbContext, warehouseService, _shippingLoggerMock.Object);

        await warehouseService.SetProductStock(product1.Id, warehouse1.Id, 100);
        await warehouseService.SetProductStock(product2.Id, warehouse1.Id, 50);

        var basket = new Basket();
        basket.LineItems.Add(new LineItem { ProductId = product1.Id, Name = product1.Name, Quantity = 1, Amount = 20m });
        basket.LineItems.Add(new LineItem { ProductId = product2.Id, Name = product2.Name, Quantity = 1, Amount = 30m });

        var shippingAddress = new Address { CountryCode = "GB" };

        // Act
        var result = await shippingService.GetRequiredWarehouses(basket, shippingAddress);

        // Assert
        Assert.NotNull(result);
        Assert.Single(result); // Both products from same warehouse
        Assert.Contains(warehouse1.Id, result);
    }

    [Fact]
    public async Task GetRequiredWarehouses_WithNoMatchingWarehouses_ReturnsEmpty()
    {
        // Arrange
        var warehouseService = new WarehouseService(_dbContext, _warehouseFactory, _warehouseLoggerMock.Object);
        var shippingService = new ShippingService(_dbContext, warehouseService, _shippingLoggerMock.Object);

        var basket = new Basket();
        basket.LineItems.Add(new LineItem { ProductId = Guid.NewGuid(), Name = "Ghost Product", Quantity = 1, Amount = 20m });

        var shippingAddress = new Address { CountryCode = "GB" };

        // Act
        var result = await shippingService.GetRequiredWarehouses(basket, shippingAddress);

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    #region Multi-Warehouse Split Fulfillment Tests

    [Fact]
    public async Task GetShippingOptionsForBasket_WithMultiWarehouseAllocation_SplitsLineItemAcrossWarehouses()
    {
        // Arrange
        var productRoot = CreateProductRoot();
        var warehouse1 = CreateWarehouse("Warehouse 1");
        var warehouse2 = CreateWarehouse("Warehouse 2");

        AddWarehouseToProductRoot(productRoot, warehouse1, priority: 1);
        AddWarehouseToProductRoot(productRoot, warehouse2, priority: 2);

        var product = CreateProduct("Test Product", productRoot);
        await _dbContext.SaveChangesAsync();

        var warehouseService = new WarehouseService(_dbContext, _warehouseFactory, _warehouseLoggerMock.Object);
        var shippingService = new ShippingService(_dbContext, warehouseService, _shippingLoggerMock.Object);

        // Setup stock: warehouse1 has 5, warehouse2 has 3 (total 8)
        await warehouseService.SetProductStock(product.Id, warehouse1.Id, 5);
        await warehouseService.SetProductStock(product.Id, warehouse2.Id, 3);

        var basket = new Basket { SubTotal = 60m, Tax = 12m, Total = 72m };
        basket.LineItems.Add(new LineItem
        {
            Id = Guid.NewGuid(),
            ProductId = product.Id,
            Name = product.Name,
            Sku = "TEST-SKU",
            Quantity = 6, // Needs both warehouses (5 + 1)
            Amount = 60m // $10 per unit
        });

        var shippingAddress = new Address { CountryCode = "GB" };

        // Act
        var result = await shippingService.GetShippingOptionsForBasket(basket, shippingAddress);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.WarehouseGroups.Count); // Split across 2 warehouses

        // Find warehouse1 group
        var warehouse1Group = result.WarehouseGroups.FirstOrDefault(g => g.WarehouseId == warehouse1.Id);
        Assert.NotNull(warehouse1Group);
        Assert.Single(warehouse1Group!.LineItems);
        Assert.Equal(5, warehouse1Group.LineItems[0].Quantity); // 5 units from warehouse1
        Assert.Equal(50m, warehouse1Group.LineItems[0].Amount); // Proportional amount: (60 / 6) * 5

        // Find warehouse2 group
        var warehouse2Group = result.WarehouseGroups.FirstOrDefault(g => g.WarehouseId == warehouse2.Id);
        Assert.NotNull(warehouse2Group);
        Assert.Single(warehouse2Group!.LineItems);
        Assert.Equal(1, warehouse2Group.LineItems[0].Quantity); // 1 unit from warehouse2
        Assert.Equal(10m, warehouse2Group.LineItems[0].Amount); // Proportional amount: (60 / 6) * 1
    }

    [Fact]
    public async Task GetShippingOptionsForBasket_WithMultiWarehouseAllocation_RespectsShippingRestrictions()
    {
        // Arrange
        var productRoot = CreateProductRoot();
        var warehouse1 = CreateWarehouse("Warehouse 1");
        var warehouse2 = CreateWarehouse("Warehouse 2");

        var shippingOption1 = new ShippingOption
        {
            Id = Guid.NewGuid(),
            Name = "Standard",
            WarehouseId = warehouse1.Id,
            DaysFrom = 2,
            DaysTo = 5,
            FixedCost = 5m
        };
        var shippingOption2 = new ShippingOption
        {
            Id = Guid.NewGuid(),
            Name = "Express",
            WarehouseId = warehouse1.Id,
            DaysFrom = 1,
            DaysTo = 1,
            FixedCost = 10m
        };
        var shippingOption3 = new ShippingOption
        {
            Id = Guid.NewGuid(),
            Name = "Standard",
            WarehouseId = warehouse2.Id,
            DaysFrom = 2,
            DaysTo = 5,
            FixedCost = 5m
        };

        warehouse1.ShippingOptions.Add(shippingOption1);
        warehouse1.ShippingOptions.Add(shippingOption2);
        warehouse2.ShippingOptions.Add(shippingOption3);
        _dbContext.ShippingOptions.Add(shippingOption1);
        _dbContext.ShippingOptions.Add(shippingOption2);
        _dbContext.ShippingOptions.Add(shippingOption3);

        AddWarehouseToProductRoot(productRoot, warehouse1, priority: 1);
        AddWarehouseToProductRoot(productRoot, warehouse2, priority: 2);

        var product = CreateProduct("Fragile Product", productRoot);

        // Product excludes Express shipping (fragile)
        product.ShippingRestrictionMode = ShippingRestrictionMode.ExcludeList;
        product.ExcludedShippingOptions.Add(shippingOption2);

        await _dbContext.SaveChangesAsync();

        var warehouseService = new WarehouseService(_dbContext, _warehouseFactory, _warehouseLoggerMock.Object);
        var shippingService = new ShippingService(_dbContext, warehouseService, _shippingLoggerMock.Object);

        await warehouseService.SetProductStock(product.Id, warehouse1.Id, 3);
        await warehouseService.SetProductStock(product.Id, warehouse2.Id, 5);

        var basket = new Basket();
        basket.LineItems.Add(new LineItem
        {
            Id = Guid.NewGuid(),
            ProductId = product.Id,
            Name = product.Name,
            Sku = "FRAGILE",
            Quantity = 6, // Needs both warehouses
            Amount = 60m
        });

        var shippingAddress = new Address { CountryCode = "GB" };

        // Act
        var result = await shippingService.GetShippingOptionsForBasket(basket, shippingAddress);

        // Assert
        Assert.Equal(2, result.WarehouseGroups.Count);

        // Both groups should only have Standard (Express excluded)
        var warehouse1Group = result.WarehouseGroups.First(g => g.WarehouseId == warehouse1.Id);
        Assert.Single(warehouse1Group.AvailableShippingOptions);
        Assert.Equal("Standard", warehouse1Group.AvailableShippingOptions[0].Name);

        var warehouse2Group = result.WarehouseGroups.First(g => g.WarehouseId == warehouse2.Id);
        Assert.Single(warehouse2Group.AvailableShippingOptions);
        Assert.Equal("Standard", warehouse2Group.AvailableShippingOptions[0].Name);
    }

    [Fact]
    public async Task GetShippingOptionsForBasket_WithMultiWarehouseAllocationThreeWarehouses_AllocatesCorrectly()
    {
        // Arrange
        var productRoot = CreateProductRoot();
        var warehouse1 = CreateWarehouse("Warehouse 1");
        var warehouse2 = CreateWarehouse("Warehouse 2");
        var warehouse3 = CreateWarehouse("Warehouse 3");

        AddWarehouseToProductRoot(productRoot, warehouse1, priority: 1);
        AddWarehouseToProductRoot(productRoot, warehouse2, priority: 2);
        AddWarehouseToProductRoot(productRoot, warehouse3, priority: 3);

        var product = CreateProduct("Popular Product", productRoot);
        await _dbContext.SaveChangesAsync();

        var warehouseService = new WarehouseService(_dbContext, _warehouseFactory, _warehouseLoggerMock.Object);
        var shippingService = new ShippingService(_dbContext, warehouseService, _shippingLoggerMock.Object);

        // Setup stock across three warehouses
        await warehouseService.SetProductStock(product.Id, warehouse1.Id, 8);
        await warehouseService.SetProductStock(product.Id, warehouse2.Id, 7);
        await warehouseService.SetProductStock(product.Id, warehouse3.Id, 10);

        var basket = new Basket { SubTotal = 200m, Tax = 40m, Total = 240m };
        basket.LineItems.Add(new LineItem
        {
            Id = Guid.NewGuid(),
            ProductId = product.Id,
            Name = product.Name,
            Sku = "POPULAR",
            Quantity = 20, // Needs all 3 warehouses: 8 + 7 + 5
            Amount = 200m // $10 per unit
        });

        var shippingAddress = new Address { CountryCode = "GB" };

        // Act
        var result = await shippingService.GetShippingOptionsForBasket(basket, shippingAddress);

        // Assert
        Assert.Equal(3, result.WarehouseGroups.Count); // Split across 3 warehouses

        var wh1Group = result.WarehouseGroups.First(g => g.WarehouseId == warehouse1.Id);
        Assert.Equal(8, wh1Group.LineItems[0].Quantity);
        Assert.Equal(80m, wh1Group.LineItems[0].Amount); // (200 / 20) * 8

        var wh2Group = result.WarehouseGroups.First(g => g.WarehouseId == warehouse2.Id);
        Assert.Equal(7, wh2Group.LineItems[0].Quantity);
        Assert.Equal(70m, wh2Group.LineItems[0].Amount); // (200 / 20) * 7

        var wh3Group = result.WarehouseGroups.First(g => g.WarehouseId == warehouse3.Id);
        Assert.Equal(5, wh3Group.LineItems[0].Quantity); // Only needs 5 from warehouse3
        Assert.Equal(50m, wh3Group.LineItems[0].Amount); // (200 / 20) * 5
    }

    #endregion

    #region Helper Methods

    private async Task<(Product product, Warehouse warehouse)> CreateProductWithWarehouse(string productName = "Test Product", string warehouseName = "Test Warehouse")
    {
        var productRoot = CreateProductRoot();
        var warehouse = CreateWarehouse(warehouseName);
        var product = CreateProduct(productName, productRoot);

        AddWarehouseToProductRoot(productRoot, warehouse, 1);

        await _dbContext.SaveChangesAsync();

        return (product, warehouse);
    }

    private ProductRoot CreateProductRoot()
    {
        var taxGroup = new TaxGroup { Id = Guid.NewGuid(), Name = "Standard VAT", TaxPercentage = 20m };
        var productType = new ProductType { Id = Guid.NewGuid(), Name = "Test Type", Alias = "test" };
        var productRoot = new ProductRoot
        {
            Id = Guid.NewGuid(),
            RootName = "Test Product Root " + Guid.NewGuid().ToString()[..8],
            TaxGroupId = taxGroup.Id,
            ProductTypeId = productType.Id
        };

        _dbContext.TaxGroups.Add(taxGroup);
        _dbContext.ProductTypes.Add(productType);
        _dbContext.RootProducts.Add(productRoot);

        return productRoot;
    }

    private Product CreateProduct(string name, ProductRoot productRoot)
    {
        var product = new Product
        {
            Id = Guid.NewGuid(),
            ProductRootId = productRoot.Id,
            ProductRoot = productRoot,
            Name = name,
            Price = 10.99m,
            Default = true
        };

        _dbContext.Products.Add(product);
        productRoot.Products.Add(product);

        return product;
    }

    private Warehouse CreateWarehouse(string name)
    {
        var warehouse = _warehouseFactory.Create(name, new Address { CountryCode = "GB" });
        _dbContext.Warehouses.Add(warehouse);
        return warehouse;
    }

    private void AddWarehouseToProductRoot(ProductRoot productRoot, Warehouse warehouse, int priority)
    {
        var association = new ProductRootWarehouse
        {
            ProductRootId = productRoot.Id,
            WarehouseId = warehouse.Id,
            PriorityOrder = priority
        };
        _dbContext.ProductRootWarehouses.Add(association);
    }

    #endregion
}

