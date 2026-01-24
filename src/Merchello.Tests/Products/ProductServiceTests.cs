using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Products.Services.Parameters;
using Merchello.Tests.TestInfrastructure;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Products;

/// <summary>
/// Integration tests for ProductService.
/// Tests variant generation, option management, and CRUD operations.
/// </summary>
[Collection("Integration Tests")]
public class ProductServiceTests
{
    private readonly ServiceTestFixture _fixture;
    private readonly IProductService _productService;
    private readonly TestDataBuilder _dataBuilder;

    public ProductServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _productService = fixture.GetService<IProductService>();
        _dataBuilder = fixture.CreateDataBuilder();
    }

    #region Create Product Tests

    [Fact]
    public async Task CreateProductRootOnly_WithValidData_CreatesProductRootWithoutProducts()
    {
        // Arrange
        var taxGroup = _dataBuilder.CreateTaxGroup();
        var productType = _dataBuilder.CreateProductType();
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var result = await _productService.CreateProductRootOnly(new CreateProductRootOnlyParameters
        {
            Name = "Test Product",
            Price = 29.99m,
            CostOfGoods = 15.00m,
            Weight = 1.5m,
            TaxGroupId = taxGroup.Id,
            ProductTypeId = productType.Id,
            CollectionIds = []
        });

        // Assert
        result.Successful.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject.RootName.ShouldBe("Test Product");

        // CreateProductRootOnly only creates the ProductRoot, not products
        // Products are created via GenerateVariantsFromOptions
        var savedRoot = await _fixture.DbContext.RootProducts
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == result.ResultObject.Id);
        savedRoot.ShouldNotBeNull();
    }

    [Fact]
    public async Task GenerateVariantsFromOptions_WithNoVariantOptions_CreatesDefaultProduct()
    {
        // Arrange
        var taxGroup = _dataBuilder.CreateTaxGroup();
        var productType = _dataBuilder.CreateProductType();
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var createResult = await _productService.CreateProductRootOnly(new CreateProductRootOnlyParameters
        {
            Name = "Single Product",
            Price = 19.99m,
            CostOfGoods = 10.00m,
            Weight = 0.5m,
            TaxGroupId = taxGroup.Id,
            ProductTypeId = productType.Id,
            CollectionIds = []
        });
        var productRootId = createResult.ResultObject!.Id;
        _fixture.DbContext.ChangeTracker.Clear();

        // Act - generate variants with no variant options
        var result = await _productService.GenerateVariantsFromOptions(new GenerateVariantsParameters
        {
            ProductRootId = productRootId,
            DefaultPrice = 19.99m,
            DefaultCostOfGoods = 10.00m
        });

        // Assert - service creates a single default product when no variant options exist
        result.Successful.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject.Count.ShouldBe(1);
        result.ResultObject.First().Default.ShouldBeTrue();
    }

    #endregion

    #region Variant Generation Tests

    [Fact]
    public async Task AddProductOption_WithThreeValues_GeneratesThreeVariants()
    {
        // Arrange - create product root first
        var taxGroup = _dataBuilder.CreateTaxGroup();
        var productType = _dataBuilder.CreateProductType();
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var createResult = await _productService.CreateProductRootOnly(new CreateProductRootOnlyParameters
        {
            Name = "T-Shirt",
            Price = 25.00m,
            CostOfGoods = 12.00m,
            Weight = 0.3m,
            TaxGroupId = taxGroup.Id,
            ProductTypeId = productType.Id,
            CollectionIds = []
        });
        createResult.Successful.ShouldBeTrue();
        var productRootId = createResult.ResultObject!.Id;
        _fixture.DbContext.ChangeTracker.Clear();

        // Act - add color option with 3 values
        var optionResult = await _productService.AddProductOption(new AddProductOptionParameters
        {
            ProductRootId = productRootId,
            Name = "Color",
            Alias = "color",
            SortOrder = 1,
            OptionTypeAlias = null,
            OptionUiAlias = null,
            IsVariant = true,
            Values =
            [
                new() { Name = "Red", FullName = "Red Color", SortOrder = 1, HexValue = "#FF0000", PriceAdjustment = 0m, CostAdjustment = 0m, SkuSuffix = "-RED" },
                new() { Name = "Blue", FullName = "Blue Color", SortOrder = 2, HexValue = "#0000FF", PriceAdjustment = 0m, CostAdjustment = 0m, SkuSuffix = "-BLUE" },
                new() { Name = "Green", FullName = "Green Color", SortOrder = 3, HexValue = "#00FF00", PriceAdjustment = 0m, CostAdjustment = 0m, SkuSuffix = "-GRN" }
            ]
        });

        // Assert
        optionResult.Successful.ShouldBeTrue();

        // Generate variants
        var generateResult = await _productService.GenerateVariantsFromOptions(new GenerateVariantsParameters
        {
            ProductRootId = productRootId,
            DefaultPrice = 25.00m,
            DefaultCostOfGoods = 12.00m
        });
        generateResult.Successful.ShouldBeTrue();
        _fixture.DbContext.ChangeTracker.Clear();

        // Verify variant count
        var variants = await _fixture.DbContext.Products
            .AsNoTracking()
            .Where(p => p.ProductRootId == productRootId)
            .ToListAsync();
        variants.Count.ShouldBe(3);

        // Verify exactly one default
        variants.Count(v => v.Default).ShouldBe(1);
    }

    [Fact]
    public async Task AddTwoOptions_GeneratesCartesianProductVariants()
    {
        // Arrange
        var taxGroup = _dataBuilder.CreateTaxGroup();
        var productType = _dataBuilder.CreateProductType();
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var createResult = await _productService.CreateProductRootOnly(new CreateProductRootOnlyParameters
        {
            Name = "Polo Shirt",
            Price = 35.00m,
            CostOfGoods = 18.00m,
            Weight = 0.4m,
            TaxGroupId = taxGroup.Id,
            ProductTypeId = productType.Id,
            CollectionIds = []
        });
        var productRootId = createResult.ResultObject!.Id;
        _fixture.DbContext.ChangeTracker.Clear();

        // Add color option (3 values)
        await _productService.AddProductOption(new AddProductOptionParameters
        {
            ProductRootId = productRootId,
            Name = "Color",
            Alias = "color",
            SortOrder = 1,
            IsVariant = true,
            Values =
            [
                new() { Name = "Red", SortOrder = 1, SkuSuffix = "-R" },
                new() { Name = "Blue", SortOrder = 2, SkuSuffix = "-B" },
                new() { Name = "White", SortOrder = 3, SkuSuffix = "-W" }
            ]
        });
        _fixture.DbContext.ChangeTracker.Clear();

        // Add size option (2 values)
        await _productService.AddProductOption(new AddProductOptionParameters
        {
            ProductRootId = productRootId,
            Name = "Size",
            Alias = "size",
            SortOrder = 2,
            IsVariant = true,
            Values =
            [
                new() { Name = "Small", SortOrder = 1, SkuSuffix = "-S" },
                new() { Name = "Large", SortOrder = 2, SkuSuffix = "-L" }
            ]
        });
        _fixture.DbContext.ChangeTracker.Clear();

        // Act - generate variants
        var generateResult = await _productService.GenerateVariantsFromOptions(new GenerateVariantsParameters
        {
            ProductRootId = productRootId,
            DefaultPrice = 35.00m,
            DefaultCostOfGoods = 18.00m
        });

        // Assert - should be 3 colors × 2 sizes = 6 variants
        generateResult.Successful.ShouldBeTrue();
        _fixture.DbContext.ChangeTracker.Clear();

        var variants = await _fixture.DbContext.Products
            .AsNoTracking()
            .Where(p => p.ProductRootId == productRootId)
            .ToListAsync();
        variants.Count.ShouldBe(6);

        // Verify exactly one default
        variants.Count(v => v.Default).ShouldBe(1);
    }

    [Fact]
    public async Task GenerateVariants_SetsVariantOptionsKeyCorrectly()
    {
        // Arrange
        var taxGroup = _dataBuilder.CreateTaxGroup();
        var productType = _dataBuilder.CreateProductType();
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var createResult = await _productService.CreateProductRootOnly(new CreateProductRootOnlyParameters
        {
            Name = "Test Product",
            Price = 20.00m,
            CostOfGoods = 10.00m,
            Weight = 0.2m,
            TaxGroupId = taxGroup.Id,
            ProductTypeId = productType.Id,
            CollectionIds = []
        });
        var productRootId = createResult.ResultObject!.Id;
        _fixture.DbContext.ChangeTracker.Clear();

        // Add an option
        await _productService.AddProductOption(new AddProductOptionParameters
        {
            ProductRootId = productRootId,
            Name = "Material",
            Alias = "material",
            SortOrder = 1,
            IsVariant = true,
            Values =
            [
                new() { Name = "Cotton", SortOrder = 1, SkuSuffix = "-COT" },
                new() { Name = "Polyester", SortOrder = 2, SkuSuffix = "-POL" }
            ]
        });
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        await _productService.GenerateVariantsFromOptions(new GenerateVariantsParameters
        {
            ProductRootId = productRootId,
            DefaultPrice = 20.00m,
            DefaultCostOfGoods = 10.00m
        });
        _fixture.DbContext.ChangeTracker.Clear();

        // Assert - each variant should have a VariantOptionsKey
        var variants = await _fixture.DbContext.Products
            .AsNoTracking()
            .Where(p => p.ProductRootId == productRootId)
            .ToListAsync();

        foreach (var variant in variants)
        {
            variant.VariantOptionsKey.ShouldNotBeNullOrEmpty();
            // VariantOptionsKey should contain GUIDs (option value IDs)
            variant.VariantOptionsKey.ShouldContain("-");
        }

        // All variants should have unique VariantOptionsKeys
        var keys = variants.Select(v => v.VariantOptionsKey).ToList();
        keys.Distinct().Count().ShouldBe(keys.Count);
    }

    #endregion

    #region Option Management Tests

    [Fact]
    public async Task RemoveProductOption_RemovesOptionOnly_VariantsRemainUntouched()
    {
        // Arrange - create product with option and generate variants
        var taxGroup = _dataBuilder.CreateTaxGroup();
        var productType = _dataBuilder.CreateProductType();
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var createResult = await _productService.CreateProductRootOnly(new CreateProductRootOnlyParameters
        {
            Name = "Product With Option",
            Price = 30.00m,
            CostOfGoods = 15.00m,
            Weight = 0.5m,
            TaxGroupId = taxGroup.Id,
            ProductTypeId = productType.Id,
            CollectionIds = []
        });
        var productRootId = createResult.ResultObject!.Id;
        _fixture.DbContext.ChangeTracker.Clear();

        var optionResult = await _productService.AddProductOption(new AddProductOptionParameters
        {
            ProductRootId = productRootId,
            Name = "Size",
            Alias = "size",
            SortOrder = 1,
            IsVariant = true,
            Values =
            [
                new() { Name = "S", SortOrder = 1, SkuSuffix = "-S" },
                new() { Name = "M", SortOrder = 2, SkuSuffix = "-M" },
                new() { Name = "L", SortOrder = 3, SkuSuffix = "-L" }
            ]
        });
        var optionId = optionResult.ResultObject!.Id;
        _fixture.DbContext.ChangeTracker.Clear();

        await _productService.GenerateVariantsFromOptions(new GenerateVariantsParameters
        {
            ProductRootId = productRootId,
            DefaultPrice = 30.00m,
            DefaultCostOfGoods = 15.00m
        });
        _fixture.DbContext.ChangeTracker.Clear();

        // Verify we have 3 variants before removing option
        var variantsBefore = await _fixture.DbContext.Products
            .AsNoTracking()
            .Where(p => p.ProductRootId == productRootId)
            .CountAsync();
        variantsBefore.ShouldBe(3);

        // Act - remove the option
        var removeResult = await _productService.RemoveProductOption(productRootId, optionId);

        // Assert - option removal succeeds
        removeResult.Successful.ShouldBeTrue();
        _fixture.DbContext.ChangeTracker.Clear();

        // RemoveProductOption only removes the option metadata - it does NOT automatically
        // delete or regenerate variants. Variants remain until explicitly updated.
        var variantsAfter = await _fixture.DbContext.Products
            .AsNoTracking()
            .Where(p => p.ProductRootId == productRootId)
            .ToListAsync();

        // Variants remain unchanged after option removal
        variantsAfter.Count.ShouldBe(3);

        // Verify option was actually removed from ProductRoot
        // (ProductOptions is stored as JSON, so no Include needed)
        var productRoot = await _fixture.DbContext.RootProducts
            .AsNoTracking()
            .FirstOrDefaultAsync(pr => pr.Id == productRootId);
        productRoot.ShouldNotBeNull();
        productRoot.ProductOptions.ShouldBeEmpty();
    }

    #endregion

    #region Default Variant Tests

    [Fact]
    public async Task SetDefaultVariant_ChangesDefaultCorrectly()
    {
        // Arrange
        var taxGroup = _dataBuilder.CreateTaxGroup();
        var productType = _dataBuilder.CreateProductType();
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var createResult = await _productService.CreateProductRootOnly(new CreateProductRootOnlyParameters
        {
            Name = "Multi-Variant Product",
            Price = 40.00m,
            CostOfGoods = 20.00m,
            Weight = 0.6m,
            TaxGroupId = taxGroup.Id,
            ProductTypeId = productType.Id,
            CollectionIds = []
        });
        var productRootId = createResult.ResultObject!.Id;
        _fixture.DbContext.ChangeTracker.Clear();

        await _productService.AddProductOption(new AddProductOptionParameters
        {
            ProductRootId = productRootId,
            Name = "Color",
            Alias = "color",
            SortOrder = 1,
            IsVariant = true,
            Values =
            [
                new() { Name = "Black", SortOrder = 1, SkuSuffix = "-BLK" },
                new() { Name = "Navy", SortOrder = 2, SkuSuffix = "-NVY" }
            ]
        });
        _fixture.DbContext.ChangeTracker.Clear();

        await _productService.GenerateVariantsFromOptions(new GenerateVariantsParameters
        {
            ProductRootId = productRootId,
            DefaultPrice = 40.00m,
            DefaultCostOfGoods = 20.00m
        });
        _fixture.DbContext.ChangeTracker.Clear();

        var variants = await _fixture.DbContext.Products
            .AsNoTracking()
            .Where(p => p.ProductRootId == productRootId)
            .ToListAsync();
        var nonDefaultVariant = variants.First(v => !v.Default);

        // Act
        var result = await _productService.SetDefaultVariant(nonDefaultVariant.Id);

        // Assert
        result.Successful.ShouldBeTrue();
        _fixture.DbContext.ChangeTracker.Clear();

        var updatedVariants = await _fixture.DbContext.Products
            .AsNoTracking()
            .Where(p => p.ProductRootId == productRootId)
            .ToListAsync();

        // Should have exactly one default
        updatedVariants.Count(v => v.Default).ShouldBe(1);
        // The one we set should be default
        updatedVariants.First(v => v.Id == nonDefaultVariant.Id).Default.ShouldBeTrue();
    }

    #endregion

    #region Delete Tests

    [Fact]
    public async Task Delete_RemovesProductRootAndAllVariants()
    {
        // Arrange
        var taxGroup = _dataBuilder.CreateTaxGroup();
        var productType = _dataBuilder.CreateProductType();
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var createResult = await _productService.CreateProductRootOnly(new CreateProductRootOnlyParameters
        {
            Name = "Product To Delete",
            Price = 50.00m,
            CostOfGoods = 25.00m,
            Weight = 0.8m,
            TaxGroupId = taxGroup.Id,
            ProductTypeId = productType.Id,
            CollectionIds = []
        });
        var productRoot = createResult.ResultObject!;
        var productRootId = productRoot.Id;
        _fixture.DbContext.ChangeTracker.Clear();

        // Add option and generate variants
        await _productService.AddProductOption(new AddProductOptionParameters
        {
            ProductRootId = productRootId,
            Name = "Style",
            Alias = "style",
            SortOrder = 1,
            IsVariant = true,
            Values =
            [
                new() { Name = "Classic", SortOrder = 1, SkuSuffix = "-CL" },
                new() { Name = "Modern", SortOrder = 2, SkuSuffix = "-MD" }
            ]
        });
        _fixture.DbContext.ChangeTracker.Clear();

        await _productService.GenerateVariantsFromOptions(new GenerateVariantsParameters
        {
            ProductRootId = productRootId,
            DefaultPrice = 50.00m,
            DefaultCostOfGoods = 25.00m
        });
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var deleteResult = await _productService.DeleteProductRoot(productRootId);

        // Assert
        deleteResult.Successful.ShouldBeTrue();
        _fixture.DbContext.ChangeTracker.Clear();

        // Verify deletion
        var deletedRoot = await _fixture.DbContext.RootProducts
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == productRootId);
        deletedRoot.ShouldBeNull();

        var remainingVariants = await _fixture.DbContext.Products
            .AsNoTracking()
            .Where(p => p.ProductRootId == productRootId)
            .CountAsync();
        remainingVariants.ShouldBe(0);
    }

    #endregion

    #region Query Tests

    [Fact]
    public async Task GetProductRoot_WithIncludes_LoadsRelatedEntities()
    {
        // Arrange
        var taxGroup = _dataBuilder.CreateTaxGroup();
        var productType = _dataBuilder.CreateProductType();
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var createResult = await _productService.CreateProductRootOnly(new CreateProductRootOnlyParameters
        {
            Name = "Product With Relations",
            Price = 60.00m,
            CostOfGoods = 30.00m,
            Weight = 1.0m,
            TaxGroupId = taxGroup.Id,
            ProductTypeId = productType.Id,
            CollectionIds = []
        });
        var productRootId = createResult.ResultObject!.Id;
        _fixture.DbContext.ChangeTracker.Clear();

        // Add a variant option (required for GenerateVariantsFromOptions to work)
        await _productService.AddProductOption(new AddProductOptionParameters
        {
            ProductRootId = productRootId,
            Name = "Color",
            Alias = "color",
            SortOrder = 1,
            IsVariant = true,
            Values = [new() { Name = "Red", SortOrder = 1, SkuSuffix = "-RED" }]
        });
        _fixture.DbContext.ChangeTracker.Clear();

        // Generate variants
        await _productService.GenerateVariantsFromOptions(new GenerateVariantsParameters
        {
            ProductRootId = productRootId,
            DefaultPrice = 60.00m,
            DefaultCostOfGoods = 30.00m
        });
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var productRoot = await _productService.GetProductRoot(
            productRootId,
            includeProducts: true,
            includeWarehouses: false);

        // Assert
        productRoot.ShouldNotBeNull();
        productRoot.Products.ShouldNotBeEmpty();
        productRoot.Products.First().Default.ShouldBeTrue();
    }

    [Fact]
    public async Task QueryProductRoots_WithPagination_ReturnsPaginatedResults()
    {
        // Arrange - create multiple products
        var taxGroup = _dataBuilder.CreateTaxGroup();
        var productType = _dataBuilder.CreateProductType();
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        for (int i = 1; i <= 5; i++)
        {
            await _productService.CreateProductRootOnly(new CreateProductRootOnlyParameters
            {
                Name = $"Product {i}",
                Price = i * 10.00m,
                CostOfGoods = i * 5.00m,
                Weight = i * 0.1m,
                TaxGroupId = taxGroup.Id,
                ProductTypeId = productType.Id,
                CollectionIds = []
            });
            _fixture.DbContext.ChangeTracker.Clear();
        }

        // Act
        var result = await _productService.QueryProductRoots(new ProductRootQueryParameters
        {
            CurrentPage = 1,
            AmountPerPage = 2
        });

        // Assert
        result.Items.Count().ShouldBe(2);
        result.TotalItems.ShouldBe(5);
        result.TotalPages.ShouldBe(3);
    }

    #endregion

    #region Non-Variant Option Tests (Add-ons)

    [Fact]
    public async Task AddProductOption_WithIsVariantFalse_DoesNotAffectExistingVariants()
    {
        // Arrange - create product with a variant option first
        var taxGroup = _dataBuilder.CreateTaxGroup();
        var productType = _dataBuilder.CreateProductType();
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var createResult = await _productService.CreateProductRootOnly(new CreateProductRootOnlyParameters
        {
            Name = "Product With Add-on",
            Price = 45.00m,
            CostOfGoods = 22.00m,
            Weight = 0.7m,
            TaxGroupId = taxGroup.Id,
            ProductTypeId = productType.Id,
            CollectionIds = []
        });
        var productRootId = createResult.ResultObject!.Id;
        _fixture.DbContext.ChangeTracker.Clear();

        // First add a variant option and generate products
        await _productService.AddProductOption(new AddProductOptionParameters
        {
            ProductRootId = productRootId,
            Name = "Size",
            Alias = "size",
            SortOrder = 1,
            IsVariant = true,
            Values =
            [
                new() { Name = "Small", SortOrder = 1, SkuSuffix = "-S" },
                new() { Name = "Large", SortOrder = 2, SkuSuffix = "-L" }
            ]
        });
        _fixture.DbContext.ChangeTracker.Clear();

        await _productService.GenerateVariantsFromOptions(new GenerateVariantsParameters
        {
            ProductRootId = productRootId,
            DefaultPrice = 45.00m,
            DefaultCostOfGoods = 22.00m
        });
        _fixture.DbContext.ChangeTracker.Clear();

        // Verify we have 2 products
        var productsBefore = await _fixture.DbContext.Products
            .AsNoTracking()
            .Where(p => p.ProductRootId == productRootId)
            .CountAsync();
        productsBefore.ShouldBe(2);

        // Act - add non-variant option (add-on/modifier)
        var optionResult = await _productService.AddProductOption(new AddProductOptionParameters
        {
            ProductRootId = productRootId,
            Name = "Gift Wrap",
            Alias = "gift-wrap",
            SortOrder = 2,
            IsVariant = false, // This is an add-on, not a variant generator
            Values =
            [
                new() { Name = "Standard Wrap", SortOrder = 1, PriceAdjustment = 5.00m, CostAdjustment = 2.00m },
                new() { Name = "Premium Wrap", SortOrder = 2, PriceAdjustment = 10.00m, CostAdjustment = 4.00m }
            ]
        });

        // Assert - adding non-variant option succeeds
        optionResult.Successful.ShouldBeTrue();
        _fixture.DbContext.ChangeTracker.Clear();

        // Should still have 2 products (non-variant options don't generate more)
        var productsAfter = await _fixture.DbContext.Products
            .AsNoTracking()
            .Where(p => p.ProductRootId == productRootId)
            .ToListAsync();
        productsAfter.Count.ShouldBe(2);

        // The option should be stored with IsVariant = false
        // (ProductOptions is stored as JSON, so no Include needed)
        var productRoot = await _fixture.DbContext.RootProducts
            .AsNoTracking()
            .FirstOrDefaultAsync(pr => pr.Id == productRootId);
        productRoot.ShouldNotBeNull();
        productRoot.ProductOptions.Count.ShouldBe(2); // Size + Gift Wrap
        productRoot.ProductOptions.Count(o => o.IsVariant).ShouldBe(1);
        productRoot.ProductOptions.Count(o => !o.IsVariant).ShouldBe(1);
    }

    #endregion

    #region GetProductRootWithDetails Tests

    [Fact]
    public async Task GetProductRootWithDetails_ReturnsProductOptionsWithMatchingVariantOptionsKeys()
    {
        // Arrange
        var taxGroup = _dataBuilder.CreateTaxGroup();
        var productType = _dataBuilder.CreateProductType();
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var createResult = await _productService.CreateProductRootOnly(new CreateProductRootOnlyParameters
        {
            Name = "Test Product",
            Price = 25.00m,
            CostOfGoods = 12.00m,
            Weight = 0.3m,
            TaxGroupId = taxGroup.Id,
            ProductTypeId = productType.Id,
            CollectionIds = []
        });
        var productRootId = createResult.ResultObject!.Id;
        _fixture.DbContext.ChangeTracker.Clear();

        // Add Color option
        await _productService.AddProductOption(new AddProductOptionParameters
        {
            ProductRootId = productRootId,
            Name = "Color",
            Alias = "color",
            SortOrder = 1,
            IsVariant = true,
            Values =
            [
                new() { Name = "Red", FullName = "Color: Red", SortOrder = 1, HexValue = "#FF0000", SkuSuffix = "-RED" },
                new() { Name = "Blue", FullName = "Color: Blue", SortOrder = 2, HexValue = "#0000FF", SkuSuffix = "-BLUE" }
            ]
        });
        _fixture.DbContext.ChangeTracker.Clear();

        // Add Size option
        await _productService.AddProductOption(new AddProductOptionParameters
        {
            ProductRootId = productRootId,
            Name = "Size",
            Alias = "size",
            SortOrder = 2,
            IsVariant = true,
            Values =
            [
                new() { Name = "Small", FullName = "Size: Small", SortOrder = 1, SkuSuffix = "-S" },
                new() { Name = "Large", FullName = "Size: Large", SortOrder = 2, SkuSuffix = "-L" }
            ]
        });
        _fixture.DbContext.ChangeTracker.Clear();

        // Generate variants
        await _productService.GenerateVariantsFromOptions(new GenerateVariantsParameters
        {
            ProductRootId = productRootId,
            DefaultPrice = 25.00m,
            DefaultCostOfGoods = 12.00m
        });
        _fixture.DbContext.ChangeTracker.Clear();

        // Act - call the SAME method the API uses
        var result = await _productService.GetProductRootWithDetails(productRootId);

        // Assert - ProductOptions should be populated
        result.ShouldNotBeNull();
        result.ProductOptions.ShouldNotBeEmpty();
        result.ProductOptions.Count.ShouldBe(2);

        // Verify option values are present
        var colorOption = result.ProductOptions.First(o => o.Name == "Color");
        colorOption.Values.Count.ShouldBe(2);
        colorOption.Values.ShouldContain(v => v.Name == "Red");
        colorOption.Values.ShouldContain(v => v.Name == "Blue");

        var sizeOption = result.ProductOptions.First(o => o.Name == "Size");
        sizeOption.Values.Count.ShouldBe(2);
        sizeOption.Values.ShouldContain(v => v.Name == "Small");
        sizeOption.Values.ShouldContain(v => v.Name == "Large");

        // Should have 4 variants (2 colors × 2 sizes)
        result.Variants.Count.ShouldBe(4);

        // Build lookup of all option value IDs to names
        var valueIdToName = result.ProductOptions
            .SelectMany(o => o.Values)
            .ToDictionary(v => v.Id, v => v.Name);

        // For each variant, verify VariantOptionsKey can be matched to option values
        var guidRegex = new System.Text.RegularExpressions.Regex(
            @"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase);

        foreach (var variant in result.Variants)
        {
            variant.VariantOptionsKey.ShouldNotBeNullOrEmpty();

            var guids = guidRegex.Matches(variant.VariantOptionsKey)
                .Select(m => Guid.Parse(m.Value))
                .ToList();

            // Should have 2 GUIDs (one per option)
            guids.Count.ShouldBe(2);

            // Each GUID should match an option value
            List<string> matchedNames = [];
            foreach (var guid in guids)
            {
                valueIdToName.ShouldContainKey(guid);
                matchedNames.Add(valueIdToName[guid]);
            }

            // Verify we got one color and one size
            matchedNames.ShouldContain(n => n == "Red" || n == "Blue");
            matchedNames.ShouldContain(n => n == "Small" || n == "Large");
        }
    }

    #endregion

    #region GetProduct with ProductRoot Tests (for Add-to-Basket flow)

    [Fact]
    public async Task GetProduct_WithIncludeProductRoot_LoadsProductOptionsFromJson()
    {
        // Arrange - create product with variant options (same flow as seed data)
        var taxGroup = _dataBuilder.CreateTaxGroup();
        var productType = _dataBuilder.CreateProductType();
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var createResult = await _productService.CreateProductRootOnly(new CreateProductRootOnlyParameters
        {
            Name = "Premium V-Neck",
            Price = 24.99m,
            CostOfGoods = 10.00m,
            Weight = 0.3m,
            TaxGroupId = taxGroup.Id,
            ProductTypeId = productType.Id,
            CollectionIds = []
        });
        var productRootId = createResult.ResultObject!.Id;
        _fixture.DbContext.ChangeTracker.Clear();

        // Add Color option
        await _productService.AddProductOption(new AddProductOptionParameters
        {
            ProductRootId = productRootId,
            Name = "Color",
            Alias = "color",
            SortOrder = 1,
            IsVariant = true,
            Values =
            [
                new() { Name = "Grey", SortOrder = 1, SkuSuffix = "-GREY" },
                new() { Name = "Navy", SortOrder = 2, SkuSuffix = "-NAVY" }
            ]
        });
        _fixture.DbContext.ChangeTracker.Clear();

        // Add Size option
        await _productService.AddProductOption(new AddProductOptionParameters
        {
            ProductRootId = productRootId,
            Name = "Size",
            Alias = "size",
            SortOrder = 2,
            IsVariant = true,
            Values =
            [
                new() { Name = "S", SortOrder = 1, SkuSuffix = "-S" },
                new() { Name = "M", SortOrder = 2, SkuSuffix = "-M" }
            ]
        });
        _fixture.DbContext.ChangeTracker.Clear();

        // Generate variants
        await _productService.GenerateVariantsFromOptions(new GenerateVariantsParameters
        {
            ProductRootId = productRootId,
            DefaultPrice = 24.99m,
            DefaultCostOfGoods = 10.00m
        });
        _fixture.DbContext.ChangeTracker.Clear();

        // Get a variant with options (any variant that has a VariantOptionsKey)
        var variants = await _fixture.DbContext.Products
            .AsNoTracking()
            .Where(p => p.ProductRootId == productRootId && p.VariantOptionsKey != null)
            .ToListAsync();
        variants.ShouldNotBeEmpty("Should have variants with VariantOptionsKey");
        var variant = variants.First();
        variant.VariantOptionsKey.ShouldNotBeNullOrEmpty("VariantOptionsKey should be set");

        // Act - Load the product the SAME way AddToBasket does
        var product = await _productService.GetProduct(new GetProductParameters
        {
            ProductId = variant.Id,
            IncludeProductRoot = true,
            IncludeTaxGroup = true,
            NoTracking = true
        });

        // Assert - ProductRoot should be loaded with ProductOptions
        product.ShouldNotBeNull();
        product.ProductRoot.ShouldNotBeNull();
        product.ProductRoot.RootName.ShouldBe("Premium V-Neck");

        // THIS IS THE CRITICAL ASSERTION - ProductOptions should be populated from JSON
        product.ProductRoot.ProductOptions.ShouldNotBeNull();
        product.ProductRoot.ProductOptions.Count.ShouldBe(2, "ProductOptions should have 2 options (Color, Size)");

        // Verify option values are present
        var colorOption = product.ProductRoot.ProductOptions.FirstOrDefault(o => o.Name == "Color");
        colorOption.ShouldNotBeNull("Color option should exist");
        colorOption.ProductOptionValues.Count.ShouldBe(2, "Color option should have 2 values");
        colorOption.ProductOptionValues.ShouldContain(v => v.Name == "Grey");
        colorOption.ProductOptionValues.ShouldContain(v => v.Name == "Navy");

        var sizeOption = product.ProductRoot.ProductOptions.FirstOrDefault(o => o.Name == "Size");
        sizeOption.ShouldNotBeNull("Size option should exist");
        sizeOption.ProductOptionValues.Count.ShouldBe(2, "Size option should have 2 values");
        sizeOption.ProductOptionValues.ShouldContain(v => v.Name == "S");
        sizeOption.ProductOptionValues.ShouldContain(v => v.Name == "M");

        // Verify VariantOptionsKey is comma-separated (simple format)
        product.VariantOptionsKey!.ShouldContain(",");
        product.VariantOptionsKey!.ShouldNotContain(",,");
    }

    #endregion
}
