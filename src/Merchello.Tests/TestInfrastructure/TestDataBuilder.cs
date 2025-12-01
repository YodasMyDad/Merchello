using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Data;
using Merchello.Core.Locality.Models;
using Merchello.Core.Products.Factories;
using Merchello.Core.Products.Models;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Warehouses.Factories;
using Merchello.Core.Warehouses.Models;

namespace Merchello.Tests.TestInfrastructure;

/// <summary>
/// Fluent builder for creating test data
/// </summary>
public class TestDataBuilder
{
    private readonly IMerchDbContext _dbContext;
    private readonly WarehouseFactory _warehouseFactory;
    private readonly TaxGroupFactory _taxGroupFactory;
    private readonly ProductTypeFactory _productTypeFactory;

    public TestDataBuilder(IMerchDbContext dbContext)
    {
        _dbContext = dbContext;
        _warehouseFactory = new WarehouseFactory();
        _taxGroupFactory = new TaxGroupFactory();
        _productTypeFactory = new ProductTypeFactory();
    }

    public TaxGroup CreateTaxGroup(string name = "Standard VAT", decimal percentage = 20m)
    {
        var taxGroup = _taxGroupFactory.Create(name, percentage);
        _dbContext.TaxGroups.Add(taxGroup);
        return taxGroup;
    }

    public ProductType CreateProductType(string name = "Test Type", string alias = "test")
    {
        var productType = _productTypeFactory.Create(name, alias);
        _dbContext.ProductTypes.Add(productType);
        return productType;
    }

    public Warehouse CreateWarehouse(string name = "Test Warehouse", string countryCode = "GB")
    {
        var warehouse = _warehouseFactory.Create(name, new Address { CountryCode = countryCode });
        _dbContext.Warehouses.Add(warehouse);
        return warehouse;
    }

    public ProductRoot CreateProductRoot(string name = "Test Product Root", TaxGroup? taxGroup = null, ProductType? productType = null)
    {
        taxGroup ??= CreateTaxGroup();
        productType ??= CreateProductType();

        var productRoot = new ProductRoot
        {
            Id = Guid.NewGuid(),
            RootName = name,
            TaxGroupId = taxGroup.Id,
            TaxGroup = taxGroup,
            ProductTypeId = productType.Id,
            ProductType = productType
        };

        _dbContext.RootProducts.Add(productRoot);
        return productRoot;
    }

    public Product CreateProduct(string name = "Test Product", ProductRoot? productRoot = null, decimal price = 10.99m)
    {
        productRoot ??= CreateProductRoot();

        var product = new Product
        {
            Id = Guid.NewGuid(),
            ProductRootId = productRoot.Id,
            ProductRoot = productRoot,
            Name = name,
            Price = price,
            Default = true
        };

        _dbContext.Products.Add(product);
        productRoot.Products.Add(product);
        return product;
    }

    public ShippingOption CreateShippingOption(
        string name = "Standard Delivery",
        Warehouse? warehouse = null,
        decimal fixedCost = 5m,
        int daysFrom = 2,
        int daysTo = 5)
    {
        warehouse ??= CreateWarehouse();

        var shippingOption = new ShippingOption
        {
            Id = Guid.NewGuid(),
            Name = name,
            WarehouseId = warehouse.Id,
            Warehouse = warehouse,
            DaysFrom = daysFrom,
            DaysTo = daysTo,
            FixedCost = fixedCost
        };

        _dbContext.ShippingOptions.Add(shippingOption);
        warehouse.ShippingOptions.Add(shippingOption);
        return shippingOption;
    }

    public void AddWarehouseToProductRoot(ProductRoot productRoot, Warehouse warehouse, int priorityOrder = 1)
    {
        var association = new ProductRootWarehouse
        {
            ProductRootId = productRoot.Id,
            WarehouseId = warehouse.Id,
            PriorityOrder = priorityOrder
        };

        _dbContext.ProductRootWarehouses.Add(association);
        productRoot.ProductRootWarehouses.Add(association);
    }

    public void AddServiceRegion(Warehouse warehouse, string countryCode, string? stateOrProvinceCode = null, bool isExcluded = false)
    {
        var region = new WarehouseServiceRegion
        {
            Id = Guid.NewGuid(),
            WarehouseId = warehouse.Id,
            CountryCode = countryCode,
            StateOrProvinceCode = stateOrProvinceCode,
            IsExcluded = isExcluded
        };

        _dbContext.WarehouseServiceRegions.Add(region);
        warehouse.ServiceRegions.Add(region);
    }

    public async Task SaveChangesAsync()
    {
        await _dbContext.SaveChangesAsync();
    }
}

