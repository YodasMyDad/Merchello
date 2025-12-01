using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Data;
using Merchello.Core.Products.Factories;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Warehouses.Factories;
using Merchello.Core.Warehouses.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Merchello.Tests.Products;

public class ProductTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IMerchDbContext _dbContext;
    private readonly ProductService _productService;

    public ProductTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _dbContext = fixture.DbContext;
        _productService = fixture.ServiceProvider.GetService<ProductService>()!;
    }

    [Fact]
    public async Task CreateSupplier_ShouldCreateSuccessfully()
    {
        _fixture.ResetDatabase();

        var supplierFactory = new WarehouseFactory();
        var dynamicSupplier = supplierFactory.Create("Dynamic");
        _dbContext.Warehouses.Add(dynamicSupplier);
        await _dbContext.SaveChangesAsync();

        var suppliers = _dbContext.Warehouses.Where(x => x.Name == "Dynamic");
        Assert.NotNull(suppliers);
        Assert.Single(suppliers);
    }

    [Fact]
    public async Task CreateTaxGroup_ShouldCreateSuccessfully()
    {
        _fixture.ResetDatabase();

        var taxGroupFactory = new TaxGroupFactory();
        var standardVatTaxGroup = taxGroupFactory.Create("Standard VAT", 20);
        var clothesTaxGroup = taxGroupFactory.Create("Clothes", 5);
        _dbContext.TaxGroups.Add(standardVatTaxGroup);
        _dbContext.TaxGroups.Add(clothesTaxGroup);
        await _dbContext.SaveChangesAsync();

        var taxgroup = _dbContext.TaxGroups.Where(x => x.Name == "Standard VAT");
        Assert.NotNull(taxgroup);
        Assert.Single(taxgroup);
    }

    [Fact]
    public async Task CreateProductType_ShouldCreateSuccessfully()
    {
        _fixture.ResetDatabase();

        var productTypeFactory = new ProductTypeFactory();
        var chairSwivel = productTypeFactory.Create("Swivel Chairs", "chairOfficeSwivel");
        var chairLegged = productTypeFactory.Create("Chair With Legs", "chairOfficeLegged");
        _dbContext.ProductTypes.Add(chairSwivel);
        _dbContext.ProductTypes.Add(chairLegged);
        await _dbContext.SaveChangesAsync();

        var productTypes = _dbContext.ProductTypes.ToList();
        Assert.Equal(2, productTypes.Count);
    }

    [Fact]
    public async Task CreateSingleProduct_ShouldCreateWithCorrectProperties()
    {
        _fixture.ResetDatabase();

        // Arrange
        var supplierFactory = new WarehouseFactory();
        var warehouse = supplierFactory.Create("Dynamic");
        _dbContext.Warehouses.Add(warehouse);

        var taxGroupFactory = new TaxGroupFactory();
        var taxGroup = taxGroupFactory.Create("Standard VAT", 20);
        _dbContext.TaxGroups.Add(taxGroup);

        var productTypeFactory = new ProductTypeFactory();
        var productType = productTypeFactory.Create("Swivel Chairs", "chairOfficeSwivel");
        _dbContext.ProductTypes.Add(productType);

        await _dbContext.SaveChangesAsync();

        var shippingOptions = new List<ShippingOption>();

        // Act
        var singleProduct = await _productService.Create("Single product", taxGroup,
            productType, warehouse, shippingOptions, 99.99m, 50, "GTIN", "SKU", []);

        // Assert
        Assert.True(singleProduct.Successful);
        var product = _dbContext.Products
            .Include(x => x.ProductRoot).ThenInclude(x => x!.ProductType)
            .Include(x => x.ProductRoot).ThenInclude(x => x!.ProductRootWarehouses)
            .Include(x => x.ProductRoot).ThenInclude(x => x!.TaxGroup)
            .AsSplitQuery()
            .AsNoTracking()
            .FirstOrDefault();

        Assert.Equal(singleProduct.ResultObject!.Id, product!.ProductRoot!.Id);
    }

    [Fact]
    public async Task CreateVariantProduct_ShouldCreateAllVariants()
    {
        _fixture.ResetDatabase();

        // Arrange
        var supplierFactory = new WarehouseFactory();
        var warehouse = supplierFactory.Create("Dynamic");
        _dbContext.Warehouses.Add(warehouse);

        var taxGroupFactory = new TaxGroupFactory();
        var taxGroup = taxGroupFactory.Create("Standard VAT", 20);
        _dbContext.TaxGroups.Add(taxGroup);

        var productTypeFactory = new ProductTypeFactory();
        var productType = productTypeFactory.Create("Swivel Chairs", "chairOfficeSwivel");
        _dbContext.ProductTypes.Add(productType);

        await _dbContext.SaveChangesAsync();

        var shippingOptions = new List<ShippingOption>();

        // Act
        var variantProduct = await _productService.Create("Variant product", taxGroup,
            productType, warehouse, shippingOptions, 999.99m, 50, "GTIN", "SKU001",
            [
                new ProductOption
                {
                    Alias = "Colour",
                    Name = "colour",
                    OptionTypeAlias = "Colour",
                    OptionUiAlias = "Colour",
                    ProductOptionValues =
                    [
                        new ProductOptionValue
                        {
                            Name = "White",
                            FullName = "White",
                            HexValue = "#FFF"
                        },
                        new ProductOptionValue
                        {
                            Name = "Black",
                            FullName = "black",
                            HexValue = "#000"
                        },
                        new ProductOptionValue
                        {
                            Name = "Red",
                            FullName = "red",
                            HexValue = "FF0000"
                        }
                    ]
                }
            ]);

        // Assert
        Assert.True(variantProduct.Successful);
        var variantProductDb = _dbContext.RootProducts
            .Include(x => x.Products)
            .Include(x => x.ProductRootWarehouses)
            .Include(x => x.ProductType)
            .Include(x => x.TaxGroup)
            .AsSplitQuery()
            .AsNoTracking()
            .FirstOrDefault(x=> x.Products.Count > 1);

        Assert.Equal(variantProductDb!.Id, variantProduct.ResultObject!.Id);
        Assert.Equal(3, variantProductDb.Products.Count);
        foreach (var product1 in variantProductDb.Products)
        {
            Assert.Equal("GTIN", product1.Gtin);
        }
        Assert.Single(variantProductDb.Products, x => x.Default);
    }

    [Fact]
    public async Task UpdateVariantProduct_ShouldAddAndRemoveOptions()
    {
        _fixture.ResetDatabase();

        // Arrange - Create a variant product first
        var supplierFactory = new WarehouseFactory();
        var warehouse = supplierFactory.Create("Dynamic");
        _dbContext.Warehouses.Add(warehouse);

        var taxGroupFactory = new TaxGroupFactory();
        var taxGroup = taxGroupFactory.Create("Standard VAT", 20);
        _dbContext.TaxGroups.Add(taxGroup);

        var productTypeFactory = new ProductTypeFactory();
        var productType = productTypeFactory.Create("Swivel Chairs", "chairOfficeSwivel");
        _dbContext.ProductTypes.Add(productType);

        await _dbContext.SaveChangesAsync();

        var variantProduct = await _productService.Create("Variant product", taxGroup,
            productType, warehouse, [], 999.99m, 50, "GTIN", "SKU001",
            [
                new ProductOption
                {
                    Alias = "Colour",
                    Name = "colour",
                    OptionTypeAlias = "Colour",
                    OptionUiAlias = "Colour",
                    ProductOptionValues =
                    [
                        new ProductOptionValue { Name = "White", FullName = "White", HexValue = "#FFF" },
                        new ProductOptionValue { Name = "Black", FullName = "black", HexValue = "#000" },
                        new ProductOptionValue { Name = "Red", FullName = "red", HexValue = "FF0000" }
                    ]
                }
            ]);

        // Act - Update to remove white and add size option
        var untrackedRootProduct = await _dbContext.RootProducts
            .Include(x => x.Categories)
            .Include(x => x.ProductType)
            .Include(x => x.ProductRootWarehouses)
            .Include(x => x.TaxGroup)
            .AsSplitQuery()
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.RootName == "Variant product");

        untrackedRootProduct!.RootName = "I am new";

        foreach (var po in untrackedRootProduct.ProductOptions)
        {
            po.ProductOptionValues.RemoveAll(x => x.Name == "White");
        }

        untrackedRootProduct.ProductOptions.Add(new ProductOption
        {
            Alias = "size",
            OptionTypeAlias = "Size",
            OptionUiAlias = "Dropdown",
            Name = "Size",
            ProductOptionValues =
            [
                new ProductOptionValue { Name = "Small", FullName = "Small" },
                new ProductOptionValue { Name = "Medium", FullName = "medium" },
                new ProductOptionValue { Name = "Large", FullName = "large" }
            ]
        });

        var result = await _productService.Update(untrackedRootProduct);

        // Assert
        Assert.True(result.Successful);
        Assert.Equal("I am new", untrackedRootProduct.RootName);

        untrackedRootProduct = await _dbContext.RootProducts
            .Include(x => x.Categories)
            .Include(x => x.ProductType)
            .Include(x => x.ProductRootWarehouses)
            .Include(x => x.TaxGroup)
            .Include(x => x.Products)
            .AsSplitQuery()
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.RootName == "I am new");

        Assert.Equal(6, untrackedRootProduct!.Products.Count);
        Assert.Single(untrackedRootProduct.Products, x => x.Default);
    }

    [Fact]
    public async Task RemoveAllOptions_ShouldConvertToSingleProduct()
    {
        _fixture.ResetDatabase();

        // Arrange - Create a variant product first
        var supplierFactory = new WarehouseFactory();
        var warehouse = supplierFactory.Create("Dynamic");
        _dbContext.Warehouses.Add(warehouse);

        var taxGroupFactory = new TaxGroupFactory();
        var taxGroup = taxGroupFactory.Create("Standard VAT", 20);
        _dbContext.TaxGroups.Add(taxGroup);

        var productTypeFactory = new ProductTypeFactory();
        var productType = productTypeFactory.Create("Swivel Chairs", "chairOfficeSwivel");
        _dbContext.ProductTypes.Add(productType);

        await _dbContext.SaveChangesAsync();

        await _productService.Create("Test Product", taxGroup,
            productType, warehouse, [], 999.99m, 50, "GTIN", "SKU001",
            [
                new ProductOption
                {
                    Alias = "Colour",
                    Name = "colour",
                    OptionTypeAlias = "Colour",
                    OptionUiAlias = "Colour",
                    ProductOptionValues =
                    [
                        new ProductOptionValue { Name = "Red", FullName = "red", HexValue = "FF0000" },
                        new ProductOptionValue { Name = "Blue", FullName = "blue", HexValue = "0000FF" }
                    ]
                }
            ]);

        // Act - Remove all options
        var untrackedRootProduct = await _dbContext.RootProducts
            .Include(x => x.Categories)
            .Include(x => x.ProductType)
            .Include(x => x.ProductRootWarehouses)
            .Include(x => x.TaxGroup)
            .AsSplitQuery()
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.RootName == "Test Product");

        untrackedRootProduct!.ProductOptions.Clear();
        var result = await _productService.Update(untrackedRootProduct);

        // Assert
        Assert.True(result.Successful);

        untrackedRootProduct = await _dbContext.RootProducts
            .Include(x => x.Categories)
            .Include(x => x.ProductType)
            .Include(x => x.ProductRootWarehouses)
            .Include(x => x.TaxGroup)
            .Include(x => x.Products)
            .AsSplitQuery()
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.RootName == "Test Product");

        Assert.Single(untrackedRootProduct!.Products);
        Assert.Single(untrackedRootProduct.Products, x => x.Default);
    }
}
