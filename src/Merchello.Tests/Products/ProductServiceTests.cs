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
        var result = await _productService.CreateProductRootOnly(
            name: "Test Product",
            price: 29.99m,
            costOfGoods: 15.00m,
            weight: 1.5m,
            taxGroupId: taxGroup.Id,
            productTypeId: productType.Id,
            collectionIds: []);

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

        var createResult = await _productService.CreateProductRootOnly(
            name: "Single Product",
            price: 19.99m,
            costOfGoods: 10.00m,
            weight: 0.5m,
            taxGroupId: taxGroup.Id,
            productTypeId: productType.Id,
            collectionIds: []);
        var productRootId = createResult.ResultObject!.Id;
        _fixture.DbContext.ChangeTracker.Clear();

        // Act - generate variants with no variant options
        var result = await _productService.GenerateVariantsFromOptions(
            productRootId, defaultPrice: 19.99m, defaultCostOfGoods: 10.00m);

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

        var createResult = await _productService.CreateProductRootOnly(
            name: "T-Shirt",
            price: 25.00m,
            costOfGoods: 12.00m,
            weight: 0.3m,
            taxGroupId: taxGroup.Id,
            productTypeId: productType.Id,
            collectionIds: []);
        createResult.Successful.ShouldBeTrue();
        var productRootId = createResult.ResultObject!.Id;
        _fixture.DbContext.ChangeTracker.Clear();

        // Act - add color option with 3 values
        var optionResult = await _productService.AddProductOption(
            productRootId: productRootId,
            name: "Color",
            alias: "color",
            sortOrder: 1,
            optionTypeAlias: null,
            optionUiAlias: null,
            isVariant: true,
            values: [
                ("Red", "Red Color", 1, "#FF0000", 0m, 0m, "-RED"),
                ("Blue", "Blue Color", 2, "#0000FF", 0m, 0m, "-BLUE"),
                ("Green", "Green Color", 3, "#00FF00", 0m, 0m, "-GRN")
            ]);

        // Assert
        optionResult.Successful.ShouldBeTrue();

        // Generate variants
        var generateResult = await _productService.GenerateVariantsFromOptions(
            productRootId, defaultPrice: 25.00m, defaultCostOfGoods: 12.00m);
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

        var createResult = await _productService.CreateProductRootOnly(
            name: "Polo Shirt",
            price: 35.00m,
            costOfGoods: 18.00m,
            weight: 0.4m,
            taxGroupId: taxGroup.Id,
            productTypeId: productType.Id,
            collectionIds: []);
        var productRootId = createResult.ResultObject!.Id;
        _fixture.DbContext.ChangeTracker.Clear();

        // Add color option (3 values)
        await _productService.AddProductOption(
            productRootId: productRootId,
            name: "Color",
            alias: "color",
            sortOrder: 1,
            optionTypeAlias: null,
            optionUiAlias: null,
            isVariant: true,
            values: [
                ("Red", null, 1, null, 0m, 0m, "-R"),
                ("Blue", null, 2, null, 0m, 0m, "-B"),
                ("White", null, 3, null, 0m, 0m, "-W")
            ]);
        _fixture.DbContext.ChangeTracker.Clear();

        // Add size option (2 values)
        await _productService.AddProductOption(
            productRootId: productRootId,
            name: "Size",
            alias: "size",
            sortOrder: 2,
            optionTypeAlias: null,
            optionUiAlias: null,
            isVariant: true,
            values: [
                ("Small", null, 1, null, 0m, 0m, "-S"),
                ("Large", null, 2, null, 0m, 0m, "-L")
            ]);
        _fixture.DbContext.ChangeTracker.Clear();

        // Act - generate variants
        var generateResult = await _productService.GenerateVariantsFromOptions(
            productRootId, defaultPrice: 35.00m, defaultCostOfGoods: 18.00m);

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

        var createResult = await _productService.CreateProductRootOnly(
            name: "Test Product",
            price: 20.00m,
            costOfGoods: 10.00m,
            weight: 0.2m,
            taxGroupId: taxGroup.Id,
            productTypeId: productType.Id,
            collectionIds: []);
        var productRootId = createResult.ResultObject!.Id;
        _fixture.DbContext.ChangeTracker.Clear();

        // Add an option
        await _productService.AddProductOption(
            productRootId: productRootId,
            name: "Material",
            alias: "material",
            sortOrder: 1,
            optionTypeAlias: null,
            optionUiAlias: null,
            isVariant: true,
            values: [
                ("Cotton", null, 1, null, 0m, 0m, "-COT"),
                ("Polyester", null, 2, null, 0m, 0m, "-POL")
            ]);
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        await _productService.GenerateVariantsFromOptions(
            productRootId, defaultPrice: 20.00m, defaultCostOfGoods: 10.00m);
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

        var createResult = await _productService.CreateProductRootOnly(
            name: "Product With Option",
            price: 30.00m,
            costOfGoods: 15.00m,
            weight: 0.5m,
            taxGroupId: taxGroup.Id,
            productTypeId: productType.Id,
            collectionIds: []);
        var productRootId = createResult.ResultObject!.Id;
        _fixture.DbContext.ChangeTracker.Clear();

        var optionResult = await _productService.AddProductOption(
            productRootId: productRootId,
            name: "Size",
            alias: "size",
            sortOrder: 1,
            optionTypeAlias: null,
            optionUiAlias: null,
            isVariant: true,
            values: [
                ("S", null, 1, null, 0m, 0m, "-S"),
                ("M", null, 2, null, 0m, 0m, "-M"),
                ("L", null, 3, null, 0m, 0m, "-L")
            ]);
        var optionId = optionResult.ResultObject!.Id;
        _fixture.DbContext.ChangeTracker.Clear();

        await _productService.GenerateVariantsFromOptions(
            productRootId, defaultPrice: 30.00m, defaultCostOfGoods: 15.00m);
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

        var createResult = await _productService.CreateProductRootOnly(
            name: "Multi-Variant Product",
            price: 40.00m,
            costOfGoods: 20.00m,
            weight: 0.6m,
            taxGroupId: taxGroup.Id,
            productTypeId: productType.Id,
            collectionIds: []);
        var productRootId = createResult.ResultObject!.Id;
        _fixture.DbContext.ChangeTracker.Clear();

        await _productService.AddProductOption(
            productRootId: productRootId,
            name: "Color",
            alias: "color",
            sortOrder: 1,
            optionTypeAlias: null,
            optionUiAlias: null,
            isVariant: true,
            values: [
                ("Black", null, 1, null, 0m, 0m, "-BLK"),
                ("Navy", null, 2, null, 0m, 0m, "-NVY")
            ]);
        _fixture.DbContext.ChangeTracker.Clear();

        await _productService.GenerateVariantsFromOptions(
            productRootId, defaultPrice: 40.00m, defaultCostOfGoods: 20.00m);
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

        var createResult = await _productService.CreateProductRootOnly(
            name: "Product To Delete",
            price: 50.00m,
            costOfGoods: 25.00m,
            weight: 0.8m,
            taxGroupId: taxGroup.Id,
            productTypeId: productType.Id,
            collectionIds: []);
        var productRoot = createResult.ResultObject!;
        var productRootId = productRoot.Id;
        _fixture.DbContext.ChangeTracker.Clear();

        // Add option and generate variants
        await _productService.AddProductOption(
            productRootId: productRootId,
            name: "Style",
            alias: "style",
            sortOrder: 1,
            optionTypeAlias: null,
            optionUiAlias: null,
            isVariant: true,
            values: [
                ("Classic", null, 1, null, 0m, 0m, "-CL"),
                ("Modern", null, 2, null, 0m, 0m, "-MD")
            ]);
        _fixture.DbContext.ChangeTracker.Clear();

        await _productService.GenerateVariantsFromOptions(
            productRootId, defaultPrice: 50.00m, defaultCostOfGoods: 25.00m);
        _fixture.DbContext.ChangeTracker.Clear();

        // Re-fetch product root for deletion
        productRoot = (await _productService.GetProductRoot(productRootId, includeProducts: true))!;

        // Act
        var deleteResult = await _productService.Delete(productRoot);

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

        var createResult = await _productService.CreateProductRootOnly(
            name: "Product With Relations",
            price: 60.00m,
            costOfGoods: 30.00m,
            weight: 1.0m,
            taxGroupId: taxGroup.Id,
            productTypeId: productType.Id,
            collectionIds: []);
        var productRootId = createResult.ResultObject!.Id;
        _fixture.DbContext.ChangeTracker.Clear();

        // Add a variant option (required for GenerateVariantsFromOptions to work)
        await _productService.AddProductOption(
            productRootId: productRootId,
            name: "Color",
            alias: "color",
            sortOrder: 1,
            optionTypeAlias: null,
            optionUiAlias: null,
            isVariant: true,
            values: [
                ("Red", null, 1, null, 0m, 0m, "-RED")
            ]);
        _fixture.DbContext.ChangeTracker.Clear();

        // Generate variants
        await _productService.GenerateVariantsFromOptions(
            productRootId, defaultPrice: 60.00m, defaultCostOfGoods: 30.00m);
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
            await _productService.CreateProductRootOnly(
                name: $"Product {i}",
                price: i * 10.00m,
                costOfGoods: i * 5.00m,
                weight: i * 0.1m,
                taxGroupId: taxGroup.Id,
                productTypeId: productType.Id,
                collectionIds: []);
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

        var createResult = await _productService.CreateProductRootOnly(
            name: "Product With Add-on",
            price: 45.00m,
            costOfGoods: 22.00m,
            weight: 0.7m,
            taxGroupId: taxGroup.Id,
            productTypeId: productType.Id,
            collectionIds: []);
        var productRootId = createResult.ResultObject!.Id;
        _fixture.DbContext.ChangeTracker.Clear();

        // First add a variant option and generate products
        await _productService.AddProductOption(
            productRootId: productRootId,
            name: "Size",
            alias: "size",
            sortOrder: 1,
            optionTypeAlias: null,
            optionUiAlias: null,
            isVariant: true,
            values: [
                ("Small", null, 1, null, 0m, 0m, "-S"),
                ("Large", null, 2, null, 0m, 0m, "-L")
            ]);
        _fixture.DbContext.ChangeTracker.Clear();

        await _productService.GenerateVariantsFromOptions(
            productRootId, defaultPrice: 45.00m, defaultCostOfGoods: 22.00m);
        _fixture.DbContext.ChangeTracker.Clear();

        // Verify we have 2 products
        var productsBefore = await _fixture.DbContext.Products
            .AsNoTracking()
            .Where(p => p.ProductRootId == productRootId)
            .CountAsync();
        productsBefore.ShouldBe(2);

        // Act - add non-variant option (add-on/modifier)
        var optionResult = await _productService.AddProductOption(
            productRootId: productRootId,
            name: "Gift Wrap",
            alias: "gift-wrap",
            sortOrder: 2,
            optionTypeAlias: null,
            optionUiAlias: null,
            isVariant: false, // This is an add-on, not a variant generator
            values: [
                ("Standard Wrap", null, 1, null, 5.00m, 2.00m, null),
                ("Premium Wrap", null, 2, null, 10.00m, 4.00m, null)
            ]);

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

        var createResult = await _productService.CreateProductRootOnly(
            name: "Test Product",
            price: 25.00m,
            costOfGoods: 12.00m,
            weight: 0.3m,
            taxGroupId: taxGroup.Id,
            productTypeId: productType.Id,
            collectionIds: []);
        var productRootId = createResult.ResultObject!.Id;
        _fixture.DbContext.ChangeTracker.Clear();

        // Add Color option
        await _productService.AddProductOption(
            productRootId: productRootId,
            name: "Color",
            alias: "color",
            sortOrder: 1,
            optionTypeAlias: null,
            optionUiAlias: null,
            isVariant: true,
            values: [
                ("Red", "Color: Red", 1, "#FF0000", 0m, 0m, "-RED"),
                ("Blue", "Color: Blue", 2, "#0000FF", 0m, 0m, "-BLUE")
            ]);
        _fixture.DbContext.ChangeTracker.Clear();

        // Add Size option
        await _productService.AddProductOption(
            productRootId: productRootId,
            name: "Size",
            alias: "size",
            sortOrder: 2,
            optionTypeAlias: null,
            optionUiAlias: null,
            isVariant: true,
            values: [
                ("Small", "Size: Small", 1, null, 0m, 0m, "-S"),
                ("Large", "Size: Large", 2, null, 0m, 0m, "-L")
            ]);
        _fixture.DbContext.ChangeTracker.Clear();

        // Generate variants
        await _productService.GenerateVariantsFromOptions(
            productRootId, defaultPrice: 25.00m, defaultCostOfGoods: 12.00m);
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
            var matchedNames = new List<string>();
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
}
