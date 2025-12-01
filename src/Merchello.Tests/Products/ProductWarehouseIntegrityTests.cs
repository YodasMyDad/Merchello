using Merchello.Core.Data;
using Merchello.Core.Products.Models;
using Merchello.Core.Warehouses.Factories;
using Merchello.Core.Warehouses.Models;
using Microsoft.EntityFrameworkCore;

namespace Merchello.Tests.Products;

public class ProductWarehouseIntegrityTests : IClassFixture<ServiceTestFixture>
{
    private readonly IMerchDbContext _dbContext;
    private readonly WarehouseFactory _warehouseFactory;

    public ProductWarehouseIntegrityTests(ServiceTestFixture fixture)
    {
        fixture.ResetDatabase();
        _dbContext = fixture.DbContext;
        _warehouseFactory = new WarehouseFactory();
    }

    [Fact]
    public async Task DeleteProduct_ShouldCascadeDeleteProductWarehouseRecords()
    {
        // Arrange
        var warehouse = CreateWarehouse();
        var product = CreateProduct();

        var productWarehouse = new ProductWarehouse
        {
            ProductId = product.Id,
            WarehouseId = warehouse.Id,
            Stock = 100
        };
        _dbContext.ProductWarehouses.Add(productWarehouse);
        await _dbContext.SaveChangesAsync();

        // Verify it exists
        var stockRecord = await _dbContext.ProductWarehouses
            .FirstOrDefaultAsync(pw => pw.ProductId == product.Id);
        Assert.NotNull(stockRecord);

        // Act - Delete the product
        _dbContext.Products.Remove(product);
        await _dbContext.SaveChangesAsync();

        // Assert - ProductWarehouse should be cascade deleted
        var deletedStockRecord = await _dbContext.ProductWarehouses
            .FirstOrDefaultAsync(pw => pw.ProductId == product.Id);
        Assert.Null(deletedStockRecord);
    }

    [Fact]
    public async Task DeleteWarehouse_ShouldCascadeDeleteProductWarehouseRecords()
    {
        // Arrange
        var warehouse = CreateWarehouse();
        var product = CreateProduct();

        var productWarehouse = new ProductWarehouse
        {
            ProductId = product.Id,
            WarehouseId = warehouse.Id,
            Stock = 100
        };
        _dbContext.ProductWarehouses.Add(productWarehouse);
        await _dbContext.SaveChangesAsync();

        // Verify it exists
        var stockRecord = await _dbContext.ProductWarehouses
            .FirstOrDefaultAsync(pw => pw.WarehouseId == warehouse.Id);
        Assert.NotNull(stockRecord);

        // Act - Delete the warehouse
        _dbContext.Warehouses.Remove(warehouse);
        await _dbContext.SaveChangesAsync();

        // Assert - ProductWarehouse should be cascade deleted
        var deletedStockRecord = await _dbContext.ProductWarehouses
            .FirstOrDefaultAsync(pw => pw.WarehouseId == warehouse.Id);
        Assert.Null(deletedStockRecord);
    }

    [Fact]
    public async Task DeleteProductRoot_ShouldCascadeDeleteAllVariantsAndStock()
    {
        // Arrange
        var warehouse = CreateWarehouse();
        var productRoot = CreateProductRoot();

        var product1 = CreateProduct("Product 1", productRoot);
        var product2 = CreateProduct("Product 2", productRoot);

        var stock1 = new ProductWarehouse
        {
            ProductId = product1.Id,
            WarehouseId = warehouse.Id,
            Stock = 100
        };
        var stock2 = new ProductWarehouse
        {
            ProductId = product2.Id,
            WarehouseId = warehouse.Id,
            Stock = 50
        };
        _dbContext.ProductWarehouses.Add(stock1);
        _dbContext.ProductWarehouses.Add(stock2);
        await _dbContext.SaveChangesAsync();

        // Act - Delete the product root
        _dbContext.RootProducts.Remove(productRoot);
        await _dbContext.SaveChangesAsync();

        // Assert - All variants should be deleted
        var deletedProducts = await _dbContext.Products
            .Where(p => p.ProductRootId == productRoot.Id)
            .ToListAsync();
        Assert.Empty(deletedProducts);

        // Assert - All stock records should be cascade deleted
        var deletedStockRecords = await _dbContext.ProductWarehouses
            .Where(pw => pw.ProductId == product1.Id || pw.ProductId == product2.Id)
            .ToListAsync();
        Assert.Empty(deletedStockRecords);
    }

    [Fact]
    public async Task DeleteWarehouse_ShouldCascadeDeleteProductRootWarehouseAssociations()
    {
        // Arrange
        var warehouse = CreateWarehouse();
        var productRoot = CreateProductRoot();

        var association = new ProductRootWarehouse
        {
            ProductRootId = productRoot.Id,
            WarehouseId = warehouse.Id,
            PriorityOrder = 1
        };
        _dbContext.ProductRootWarehouses.Add(association);
        await _dbContext.SaveChangesAsync();

        // Verify it exists
        var savedAssociation = await _dbContext.ProductRootWarehouses
            .FirstOrDefaultAsync(prw => prw.WarehouseId == warehouse.Id);
        Assert.NotNull(savedAssociation);

        // Act - Delete the warehouse
        _dbContext.Warehouses.Remove(warehouse);
        await _dbContext.SaveChangesAsync();

        // Assert - ProductRootWarehouse should be cascade deleted
        var deletedAssociation = await _dbContext.ProductRootWarehouses
            .FirstOrDefaultAsync(prw => prw.WarehouseId == warehouse.Id);
        Assert.Null(deletedAssociation);
    }

    [Fact]
    public async Task DeleteProduct_WithMultipleWarehouses_ShouldOnlyDeleteRelevantStockRecords()
    {
        // Arrange
        var warehouse1 = CreateWarehouse("Warehouse 1");
        var warehouse2 = CreateWarehouse("Warehouse 2");
        var product1 = CreateProduct("Product 1");
        var product2 = CreateProduct("Product 2");

        // Create stock records
        _dbContext.ProductWarehouses.Add(new ProductWarehouse
        {
            ProductId = product1.Id,
            WarehouseId = warehouse1.Id,
            Stock = 100
        });
        _dbContext.ProductWarehouses.Add(new ProductWarehouse
        {
            ProductId = product1.Id,
            WarehouseId = warehouse2.Id,
            Stock = 50
        });
        _dbContext.ProductWarehouses.Add(new ProductWarehouse
        {
            ProductId = product2.Id,
            WarehouseId = warehouse1.Id,
            Stock = 75
        });
        await _dbContext.SaveChangesAsync();

        // Act - Delete product1
        _dbContext.Products.Remove(product1);
        await _dbContext.SaveChangesAsync();

        // Assert - Only product1's stock records should be deleted
        var product1StockRecords = await _dbContext.ProductWarehouses
            .Where(pw => pw.ProductId == product1.Id)
            .ToListAsync();
        Assert.Empty(product1StockRecords);

        // Assert - Product2's stock record should remain
        var product2StockRecords = await _dbContext.ProductWarehouses
            .Where(pw => pw.ProductId == product2.Id)
            .ToListAsync();
        Assert.Single(product2StockRecords);
    }

    [Fact]
    public async Task RemoveProductFromWarehouse_ManualCleanup_ShouldRemoveStockRecord()
    {
        // Arrange
        var warehouse = CreateWarehouse();
        var product = CreateProduct();

        var productWarehouse = new ProductWarehouse
        {
            ProductId = product.Id,
            WarehouseId = warehouse.Id,
            Stock = 100
        };
        _dbContext.ProductWarehouses.Add(productWarehouse);
        await _dbContext.SaveChangesAsync();

        // Act - Manually remove the stock record (simulating RemoveWarehouseFromProductRoot)
        _dbContext.ProductWarehouses.Remove(productWarehouse);
        await _dbContext.SaveChangesAsync();

        // Assert
        var deletedStockRecord = await _dbContext.ProductWarehouses
            .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.WarehouseId == warehouse.Id);
        Assert.Null(deletedStockRecord);

        // Product and warehouse should still exist
        var productStillExists = await _dbContext.Products.FindAsync(product.Id);
        var warehouseStillExists = await _dbContext.Warehouses.FindAsync(warehouse.Id);
        Assert.NotNull(productStillExists);
        Assert.NotNull(warehouseStillExists);
    }

    [Fact]
    public async Task OrphanedProductWarehouse_ShouldNotExistAfterProductDeletion()
    {
        // Arrange
        var warehouse1 = CreateWarehouse("Warehouse 1");
        var warehouse2 = CreateWarehouse("Warehouse 2");
        var warehouse3 = CreateWarehouse("Warehouse 3");
        var productRoot = CreateProductRoot();

        // Create 3 variants
        var variant1 = CreateProduct("Variant 1", productRoot);
        var variant2 = CreateProduct("Variant 2", productRoot);
        var variant3 = CreateProduct("Variant 3", productRoot);

        // Add stock in multiple warehouses for each variant
        foreach (var product in new[] { variant1, variant2, variant3 })
        {
            foreach (var warehouse in new[] { warehouse1, warehouse2, warehouse3 })
            {
                _dbContext.ProductWarehouses.Add(new ProductWarehouse
                {
                    ProductId = product.Id,
                    WarehouseId = warehouse.Id,
                    Stock = 10
                });
            }
        }
        await _dbContext.SaveChangesAsync();

        // Verify we have 9 stock records (3 products × 3 warehouses)
        var initialCount = await _dbContext.ProductWarehouses.CountAsync();
        Assert.Equal(9, initialCount);

        // Act - Delete variant2 (simulating variant deletion during product update)
        _dbContext.Products.Remove(variant2);
        await _dbContext.SaveChangesAsync();

        // Assert - Should only have 6 stock records left (2 products × 3 warehouses)
        var finalCount = await _dbContext.ProductWarehouses.CountAsync();
        Assert.Equal(6, finalCount);

        // Assert - No orphaned records for deleted variant
        var orphanedRecords = await _dbContext.ProductWarehouses
            .Where(pw => pw.ProductId == variant2.Id)
            .ToListAsync();
        Assert.Empty(orphanedRecords);
    }

    #region Helper Methods

    private Warehouse CreateWarehouse(string name = "Test Warehouse")
    {
        var warehouse = _warehouseFactory.Create(name);
        _dbContext.Warehouses.Add(warehouse);
        _dbContext.SaveChanges();
        return warehouse;
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
            RootName = "Test Product Root",
            TaxGroupId = taxGroup.Id,
            ProductTypeId = productType.Id
        };
        _dbContext.RootProducts.Add(productRoot);
        _dbContext.SaveChanges();

        return productRoot;
    }

    private Product CreateProduct(string? name = null, ProductRoot? productRoot = null)
    {
        if (productRoot == null)
        {
            productRoot = CreateProductRoot();
        }

        var product = new Product
        {
            Id = Guid.NewGuid(),
            ProductRootId = productRoot.Id,
            Name = name ?? "Test Product",
            Price = 10.99m,
            Default = true
        };
        _dbContext.Products.Add(product);
        _dbContext.SaveChanges();

        return product;
    }

    #endregion
}

