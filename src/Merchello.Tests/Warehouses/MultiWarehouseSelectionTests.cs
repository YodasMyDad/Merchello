using Merchello.Core.Data;
using Merchello.Core.Locality.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Warehouses.Factories;
using Merchello.Core.Warehouses.Models;
using Merchello.Core.Warehouses.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;

namespace Merchello.Tests.Warehouses;

public class MultiWarehouseSelectionTests : IClassFixture<ServiceTestFixture>
{
    private readonly IMerchDbContext _dbContext;
    private readonly WarehouseService _warehouseService;
    private readonly Mock<ILogger<WarehouseService>> _loggerMock;
    private readonly WarehouseFactory _warehouseFactory;

    public MultiWarehouseSelectionTests(ServiceTestFixture fixture)
    {
        fixture.ResetDatabase();
        _dbContext = fixture.DbContext;
        _loggerMock = new Mock<ILogger<WarehouseService>>();
        _warehouseFactory = new WarehouseFactory();
        _warehouseService = new WarehouseService(_dbContext, _warehouseFactory, _loggerMock.Object);
    }

    [Fact]
    public async Task SelectWarehouseForProduct_WithPriorityOrder_ShouldSelectHighestPriority()
    {
        // Arrange
        var (product, warehouse1, warehouse2, warehouse3) = CreateMultiWarehouseProductScenario();

        // Set stock in all warehouses
        await SetStock(product.Id, warehouse1.Id, 50);
        await SetStock(product.Id, warehouse2.Id, 30);
        await SetStock(product.Id, warehouse3.Id, 100);

        var shippingAddress = new Address { CountryCode = "GB" };

        // Act
        var result = await _warehouseService.SelectWarehouseForProduct(product, shippingAddress, quantity: 1);

        // Assert
        Assert.True(result.Success);
        Assert.NotNull(result.Warehouse);
        Assert.Equal(warehouse1.Id, result.Warehouse.Id); // Priority 1 should be selected
        Assert.Equal(50, result.AvailableStock);
    }

    [Fact]
    public async Task SelectWarehouseForProduct_PrimaryOutOfStock_ShouldFallbackToSecondary()
    {
        // Arrange
        var (product, warehouse1, warehouse2, warehouse3) = CreateMultiWarehouseProductScenario();

        // Primary warehouse out of stock
        await SetStock(product.Id, warehouse1.Id, 0);
        await SetStock(product.Id, warehouse2.Id, 30);
        await SetStock(product.Id, warehouse3.Id, 100);

        var shippingAddress = new Address { CountryCode = "GB" };

        // Act
        var result = await _warehouseService.SelectWarehouseForProduct(product, shippingAddress, quantity: 1);

        // Assert
        Assert.True(result.Success);
        Assert.NotNull(result.Warehouse);
        Assert.Equal(warehouse2.Id, result.Warehouse.Id); // Should fallback to Priority 2
        Assert.Equal(30, result.AvailableStock);
    }

    [Fact]
    public async Task SelectWarehouseForProduct_InsufficientStockInPrimary_ShouldFallbackToSecondary()
    {
        // Arrange
        var (product, warehouse1, warehouse2, warehouse3) = CreateMultiWarehouseProductScenario();

        await SetStock(product.Id, warehouse1.Id, 5);  // Not enough
        await SetStock(product.Id, warehouse2.Id, 30); // Enough
        await SetStock(product.Id, warehouse3.Id, 100);

        var shippingAddress = new Address { CountryCode = "GB" };

        // Act - Request 10 units
        var result = await _warehouseService.SelectWarehouseForProduct(product, shippingAddress, quantity: 10);

        // Assert
        Assert.True(result.Success);
        Assert.Equal(warehouse2.Id, result.Warehouse!.Id); // Should skip warehouse1 due to insufficient stock
        Assert.Equal(30, result.AvailableStock);
    }

    [Fact]
    public async Task SelectWarehouseForProduct_AllWarehousesOutOfStock_ShouldFail()
    {
        // Arrange
        var (product, warehouse1, warehouse2, warehouse3) = CreateMultiWarehouseProductScenario();

        await SetStock(product.Id, warehouse1.Id, 0);
        await SetStock(product.Id, warehouse2.Id, 0);
        await SetStock(product.Id, warehouse3.Id, 0);

        var shippingAddress = new Address { CountryCode = "GB" };

        // Act
        var result = await _warehouseService.SelectWarehouseForProduct(product, shippingAddress, quantity: 1);

        // Assert
        Assert.False(result.Success);
        Assert.Contains("Insufficient total stock", result.FailureReason);
    }

    [Fact]
    public async Task SelectWarehouseForProduct_RegionNotServed_ShouldSkipWarehouse()
    {
        // Arrange
        var productRoot = CreateProductRoot();

        // Warehouse 1: Only serves US
        var warehouse1 = CreateWarehouse("US Only Warehouse");
        AddServiceRegion(warehouse1, "US", isExcluded: false);
        AddWarehouseToProduct(productRoot, warehouse1, priority: 1);

        // Warehouse 2: Only serves GB
        var warehouse2 = CreateWarehouse("GB Only Warehouse");
        AddServiceRegion(warehouse2, "GB", isExcluded: false);
        AddWarehouseToProduct(productRoot, warehouse2, priority: 2);

        var product = CreateProduct(productRoot);
        await SetStock(product.Id, warehouse1.Id, 100);
        await SetStock(product.Id, warehouse2.Id, 50);

        var shippingAddress = new Address { CountryCode = "GB" };

        // Act
        var result = await _warehouseService.SelectWarehouseForProduct(product, shippingAddress, quantity: 1);

        // Assert
        Assert.True(result.Success);
        Assert.Equal(warehouse2.Id, result.Warehouse!.Id); // Should skip US warehouse, select GB warehouse
    }

    [Fact]
    public async Task SelectWarehouseForProduct_ExcludedRegion_ShouldSkipWarehouse()
    {
        // Arrange
        var productRoot = CreateProductRoot();

        // Warehouse 1: Serves GB but excludes Northern Ireland
        var warehouse1 = CreateWarehouse("GB Warehouse - No NI");
        AddServiceRegion(warehouse1, "GB", isExcluded: false);
        AddServiceRegion(warehouse1, "GB", stateOrProvince: "NIR", isExcluded: true);
        AddWarehouseToProduct(productRoot, warehouse1, priority: 1);

        // Warehouse 2: Serves all of GB
        var warehouse2 = CreateWarehouse("GB All Regions Warehouse");
        AddServiceRegion(warehouse2, "GB", isExcluded: false);
        AddWarehouseToProduct(productRoot, warehouse2, priority: 2);

        var product = CreateProduct(productRoot);
        await SetStock(product.Id, warehouse1.Id, 100);
        await SetStock(product.Id, warehouse2.Id, 50);

        var shippingAddress = new Address
        {
            CountryCode = "GB",
            CountyState = new CountyState { RegionCode = "NIR" }
        };

        // Act
        var result = await _warehouseService.SelectWarehouseForProduct(product, shippingAddress, quantity: 1);

        // Assert
        Assert.True(result.Success);
        Assert.Equal(warehouse2.Id, result.Warehouse!.Id); // Should skip warehouse1 due to exclusion
    }

    [Fact]
    public async Task SelectWarehouseForProduct_NoWarehousesConfigured_ShouldFail()
    {
        // Arrange
        var productRoot = CreateProductRoot();
        var product = CreateProduct(productRoot);

        var shippingAddress = new Address { CountryCode = "GB" };

        // Act
        var result = await _warehouseService.SelectWarehouseForProduct(product, shippingAddress, quantity: 1);

        // Assert
        Assert.False(result.Success);
        Assert.Contains("No warehouses configured", result.FailureReason);
    }

    [Fact]
    public async Task SelectWarehouseForProduct_NoServiceRegions_ShouldServeAllRegions()
    {
        // Arrange
        var productRoot = CreateProductRoot();

        // Warehouse with NO service regions = serves everywhere
        var warehouse = CreateWarehouse("Global Warehouse");
        // Don't add any service regions
        AddWarehouseToProduct(productRoot, warehouse, priority: 1);

        var product = CreateProduct(productRoot);
        await SetStock(product.Id, warehouse.Id, 100);

        var usAddress = new Address { CountryCode = "US" };
        var gbAddress = new Address { CountryCode = "GB" };
        var frAddress = new Address { CountryCode = "FR" };

        // Act
        var usResult = await _warehouseService.SelectWarehouseForProduct(product, usAddress, quantity: 1);
        var gbResult = await _warehouseService.SelectWarehouseForProduct(product, gbAddress, quantity: 1);
        var frResult = await _warehouseService.SelectWarehouseForProduct(product, frAddress, quantity: 1);

        // Assert
        Assert.True(usResult.Success);
        Assert.True(gbResult.Success);
        Assert.True(frResult.Success);

        Assert.Equal(warehouse.Id, usResult.Warehouse!.Id);
        Assert.Equal(warehouse.Id, gbResult.Warehouse!.Id);
        Assert.Equal(warehouse.Id, frResult.Warehouse!.Id);
    }

    [Fact]
    public async Task SelectWarehouseForProduct_ComplexFallbackScenario_ShouldSelectCorrectly()
    {
        // Arrange
        var productRoot = CreateProductRoot();

        // Warehouse 1 (Priority 1): GB only, out of stock
        var warehouse1 = CreateWarehouse("GB Primary");
        AddServiceRegion(warehouse1, "GB", isExcluded: false);
        AddWarehouseToProduct(productRoot, warehouse1, priority: 1);

        // Warehouse 2 (Priority 2): US only (wrong region)
        var warehouse2 = CreateWarehouse("US Warehouse");
        AddServiceRegion(warehouse2, "US", isExcluded: false);
        AddWarehouseToProduct(productRoot, warehouse2, priority: 2);

        // Warehouse 3 (Priority 3): GB, has stock
        var warehouse3 = CreateWarehouse("GB Secondary");
        AddServiceRegion(warehouse3, "GB", isExcluded: false);
        AddWarehouseToProduct(productRoot, warehouse3, priority: 3);

        var product = CreateProduct(productRoot);
        await SetStock(product.Id, warehouse1.Id, 0);   // Out of stock
        await SetStock(product.Id, warehouse2.Id, 100); // Wrong region
        await SetStock(product.Id, warehouse3.Id, 50);  // Perfect match

        var shippingAddress = new Address { CountryCode = "GB" };

        // Act
        var result = await _warehouseService.SelectWarehouseForProduct(product, shippingAddress, quantity: 1);

        // Assert
        Assert.True(result.Success);
        Assert.Equal(warehouse3.Id, result.Warehouse!.Id); // Should skip 1 (no stock) and 2 (wrong region), select 3
        Assert.Equal(50, result.AvailableStock);
    }

    #region Multi-Warehouse Allocation Tests

    [Fact]
    public async Task SelectWarehouseForProduct_InsufficientStockInSingleWarehouse_ShouldAllocateAcrossMultiple()
    {
        // Arrange
        var (product, warehouse1, warehouse2, warehouse3) = CreateMultiWarehouseProductScenario();

        // No single warehouse has 20 units, but combined they do
        await SetStock(product.Id, warehouse1.Id, 8);  // Priority 1: 8 units
        await SetStock(product.Id, warehouse2.Id, 7);  // Priority 2: 7 units
        await SetStock(product.Id, warehouse3.Id, 10); // Priority 3: 10 units

        var shippingAddress = new Address { CountryCode = "GB" };

        // Act - Request 20 units (no single warehouse has enough)
        var result = await _warehouseService.SelectWarehouseForProduct(product, shippingAddress, quantity: 20);

        // Assert
        Assert.True(result.Success);
        Assert.Null(result.Warehouse); // Single warehouse should be null
        Assert.Equal(3, result.WarehouseAllocations.Count);
        Assert.Equal(20, result.TotalAllocatedQuantity);

        // Verify allocation respects priority order
        Assert.Equal(warehouse1.Id, result.WarehouseAllocations[0].Warehouse.Id);
        Assert.Equal(8, result.WarehouseAllocations[0].AllocatedQuantity);

        Assert.Equal(warehouse2.Id, result.WarehouseAllocations[1].Warehouse.Id);
        Assert.Equal(7, result.WarehouseAllocations[1].AllocatedQuantity);

        Assert.Equal(warehouse3.Id, result.WarehouseAllocations[2].Warehouse.Id);
        Assert.Equal(5, result.WarehouseAllocations[2].AllocatedQuantity); // Only needs 5 from warehouse3
    }

    [Fact]
    public async Task SelectWarehouseForProduct_PartialStockAcrossTwoWarehouses_ShouldAllocateCorrectly()
    {
        // Arrange
        var (product, warehouse1, warehouse2, warehouse3) = CreateMultiWarehouseProductScenario();

        await SetStock(product.Id, warehouse1.Id, 5);  // Priority 1: 5 units
        await SetStock(product.Id, warehouse2.Id, 3);  // Priority 2: 3 units
        await SetStock(product.Id, warehouse3.Id, 0);  // Priority 3: Out of stock

        var shippingAddress = new Address { CountryCode = "GB" };

        // Act - Request 6 units (need both warehouses)
        var result = await _warehouseService.SelectWarehouseForProduct(product, shippingAddress, quantity: 6);

        // Assert
        Assert.True(result.Success);
        Assert.Null(result.Warehouse);
        Assert.Equal(2, result.WarehouseAllocations.Count);
        Assert.Equal(6, result.TotalAllocatedQuantity);

        Assert.Equal(warehouse1.Id, result.WarehouseAllocations[0].Warehouse.Id);
        Assert.Equal(5, result.WarehouseAllocations[0].AllocatedQuantity);

        Assert.Equal(warehouse2.Id, result.WarehouseAllocations[1].Warehouse.Id);
        Assert.Equal(1, result.WarehouseAllocations[1].AllocatedQuantity); // Only needs 1 from warehouse2
    }

    [Fact]
    public async Task SelectWarehouseForProduct_InsufficientTotalStock_ShouldFail()
    {
        // Arrange
        var (product, warehouse1, warehouse2, warehouse3) = CreateMultiWarehouseProductScenario();

        await SetStock(product.Id, warehouse1.Id, 2);
        await SetStock(product.Id, warehouse2.Id, 3);
        await SetStock(product.Id, warehouse3.Id, 4);
        // Total: 9 units available

        var shippingAddress = new Address { CountryCode = "GB" };

        // Act - Request 10 units (more than total available)
        var result = await _warehouseService.SelectWarehouseForProduct(product, shippingAddress, quantity: 10);

        // Assert
        Assert.False(result.Success);
        Assert.Contains("Insufficient total stock", result.FailureReason);
        Assert.Contains("10 units required", result.FailureReason);
        Assert.Contains("9 available", result.FailureReason);
    }

    [Fact]
    public async Task SelectWarehouseForProduct_MultiWarehouseWithRegionRestrictions_ShouldOnlyAllocateFromEligible()
    {
        // Arrange
        var productRoot = CreateProductRoot();

        // Warehouse 1: GB only, low stock
        var warehouse1 = CreateWarehouse("GB Warehouse");
        AddServiceRegion(warehouse1, "GB", isExcluded: false);
        AddWarehouseToProduct(productRoot, warehouse1, priority: 1);

        // Warehouse 2: US only (wrong region)
        var warehouse2 = CreateWarehouse("US Warehouse");
        AddServiceRegion(warehouse2, "US", isExcluded: false);
        AddWarehouseToProduct(productRoot, warehouse2, priority: 2);

        // Warehouse 3: GB, good stock
        var warehouse3 = CreateWarehouse("GB Warehouse 2");
        AddServiceRegion(warehouse3, "GB", isExcluded: false);
        AddWarehouseToProduct(productRoot, warehouse3, priority: 3);

        var product = CreateProduct(productRoot);
        await SetStock(product.Id, warehouse1.Id, 3);   // GB: 3 units
        await SetStock(product.Id, warehouse2.Id, 100); // US: 100 units (but can't serve GB)
        await SetStock(product.Id, warehouse3.Id, 5);   // GB: 5 units

        var shippingAddress = new Address { CountryCode = "GB" };

        // Act - Request 6 units
        var result = await _warehouseService.SelectWarehouseForProduct(product, shippingAddress, quantity: 6);

        // Assert
        Assert.True(result.Success);
        Assert.Equal(2, result.WarehouseAllocations.Count); // Should only use GB warehouses
        Assert.Equal(6, result.TotalAllocatedQuantity);

        // Warehouse 2 (US) should NOT be included
        Assert.DoesNotContain(result.WarehouseAllocations, a => a.Warehouse.Id == warehouse2.Id);

        // Should allocate from warehouse1 and warehouse3
        Assert.Equal(warehouse1.Id, result.WarehouseAllocations[0].Warehouse.Id);
        Assert.Equal(3, result.WarehouseAllocations[0].AllocatedQuantity);

        Assert.Equal(warehouse3.Id, result.WarehouseAllocations[1].Warehouse.Id);
        Assert.Equal(3, result.WarehouseAllocations[1].AllocatedQuantity);
    }

    [Fact]
    public async Task SelectWarehouseForProduct_PrefersSingleWarehouse_WhenSufficientStock()
    {
        // Arrange
        var (product, warehouse1, warehouse2, warehouse3) = CreateMultiWarehouseProductScenario();

        await SetStock(product.Id, warehouse1.Id, 100); // Plenty of stock
        await SetStock(product.Id, warehouse2.Id, 50);
        await SetStock(product.Id, warehouse3.Id, 30);

        var shippingAddress = new Address { CountryCode = "GB" };

        // Act - Request 10 units
        var result = await _warehouseService.SelectWarehouseForProduct(product, shippingAddress, quantity: 10);

        // Assert - Should prefer single warehouse fulfillment
        Assert.True(result.Success);
        Assert.NotNull(result.Warehouse); // Single warehouse mode
        Assert.Equal(warehouse1.Id, result.Warehouse.Id);
        Assert.Equal(100, result.AvailableStock);
        Assert.Empty(result.WarehouseAllocations); // No split allocation needed
    }

    #endregion

    #region Helper Methods

    private (Product product, Warehouse warehouse1, Warehouse warehouse2, Warehouse warehouse3)
        CreateMultiWarehouseProductScenario()
    {
        var productRoot = CreateProductRoot();

        var warehouse1 = CreateWarehouse("Warehouse Priority 1");
        var warehouse2 = CreateWarehouse("Warehouse Priority 2");
        var warehouse3 = CreateWarehouse("Warehouse Priority 3");

        // All serve GB
        foreach (var warehouse in new[] { warehouse1, warehouse2, warehouse3 })
        {
            AddServiceRegion(warehouse, "GB", isExcluded: false);
        }

        AddWarehouseToProduct(productRoot, warehouse1, priority: 1);
        AddWarehouseToProduct(productRoot, warehouse2, priority: 2);
        AddWarehouseToProduct(productRoot, warehouse3, priority: 3);

        var product = CreateProduct(productRoot);

        return (product, warehouse1, warehouse2, warehouse3);
    }

    private ProductRoot CreateProductRoot()
    {
        var taxGroup = new Core.Accounting.Models.TaxGroup
        {
            Id = Guid.NewGuid(),
            Name = "Standard VAT",
            TaxPercentage = 20m
        };
        _dbContext.TaxGroups.Add(taxGroup);

        var productType = new ProductType
        {
            Id = Guid.NewGuid(),
            Name = "Test Type",
            Alias = "test"
        };
        _dbContext.ProductTypes.Add(productType);

        var productRoot = new ProductRoot
        {
            Id = Guid.NewGuid(),
            RootName = "Test Product",
            TaxGroupId = taxGroup.Id,
            ProductTypeId = productType.Id
        };
        _dbContext.RootProducts.Add(productRoot);
        _dbContext.SaveChanges();

        return productRoot;
    }

    private Product CreateProduct(ProductRoot productRoot)
    {
        var product = new Product
        {
            Id = Guid.NewGuid(),
            ProductRootId = productRoot.Id,
            ProductRoot = productRoot,
            Name = "Test Product Variant",
            Price = 10.99m,
            Default = true
        };
        _dbContext.Products.Add(product);
        _dbContext.SaveChanges();

        return product;
    }

    private Warehouse CreateWarehouse(string name)
    {
        var warehouse = _warehouseFactory.Create(name, new Address { CountryCode = "GB" });
        _dbContext.Warehouses.Add(warehouse);
        _dbContext.SaveChanges();
        return warehouse;
    }

    private void AddServiceRegion(Warehouse warehouse, string countryCode, string? stateOrProvince = null, bool isExcluded = false)
    {
        var region = new WarehouseServiceRegion
        {
            Id = Guid.NewGuid(),
            WarehouseId = warehouse.Id,
            CountryCode = countryCode,
            StateOrProvinceCode = stateOrProvince,
            IsExcluded = isExcluded
        };
        _dbContext.WarehouseServiceRegions.Add(region);
        _dbContext.SaveChanges();
    }

    private void AddWarehouseToProduct(ProductRoot productRoot, Warehouse warehouse, int priority)
    {
        var association = new ProductRootWarehouse
        {
            ProductRootId = productRoot.Id,
            WarehouseId = warehouse.Id,
            PriorityOrder = priority
        };
        _dbContext.ProductRootWarehouses.Add(association);
        _dbContext.SaveChanges();
    }

    private async Task SetStock(Guid productId, Guid warehouseId, int stock)
    {
        await _warehouseService.SetProductStock(productId, warehouseId, stock);
    }

    #endregion
}

