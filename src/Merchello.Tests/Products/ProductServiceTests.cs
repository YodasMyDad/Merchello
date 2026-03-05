using Merchello.Core.Products.Dtos;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Products.Services.Parameters;
using Merchello.Core.Shared.Dtos;
using Merchello.Tests.TestInfrastructure;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Products;

[Collection("Integration Tests")]
public class ProductServiceTests
{
    private readonly ServiceTestFixture _fixture;
    private readonly IProductService _productService;

    public ProductServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _productService = _fixture.GetService<IProductService>();
    }

    #region Helpers

    /// <summary>
    /// Creates a product root with a default variant and two variant options (Size: S/M/L, Colour: Red/Blue),
    /// generating 6 variants via SaveProductOptions. Returns the product root ID and option/value IDs.
    /// </summary>
    private async Task<(Guid ProductRootId, SaveProductOptionDto SizeOption, SaveProductOptionDto ColourOption)> SetupProductWithVariantOptions()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var productRoot = dataBuilder.CreateProductRoot("Test Chair");
        dataBuilder.CreateProduct("Test Chair - Default", productRoot, price: 100m);
        await dataBuilder.SaveChangesAsync();

        var sizeOption = new SaveProductOptionDto
        {
            Name = "Size",
            SortOrder = 0,
            IsVariant = true,
            Values =
            [
                new SaveOptionValueDto { Name = "Small", SortOrder = 0 },
                new SaveOptionValueDto { Name = "Medium", SortOrder = 1 },
                new SaveOptionValueDto { Name = "Large", SortOrder = 2 }
            ]
        };
        var colourOption = new SaveProductOptionDto
        {
            Name = "Colour",
            SortOrder = 1,
            IsVariant = true,
            Values =
            [
                new SaveOptionValueDto { Name = "Red", SortOrder = 0 },
                new SaveOptionValueDto { Name = "Blue", SortOrder = 1 }
            ]
        };

        var result = await _productService.SaveProductOptions(productRoot.Id, [sizeOption, colourOption]);
        result.Success.ShouldBeTrue();

        // Populate IDs from saved result for subsequent calls
        var savedSize = result.ResultObject!.Single(o => o.Name == "Size");
        var savedColour = result.ResultObject!.Single(o => o.Name == "Colour");

        sizeOption.Id = savedSize.Id;
        sizeOption.Values[0].Id = savedSize.ProductOptionValues.Single(v => v.Name == "Small").Id;
        sizeOption.Values[1].Id = savedSize.ProductOptionValues.Single(v => v.Name == "Medium").Id;
        sizeOption.Values[2].Id = savedSize.ProductOptionValues.Single(v => v.Name == "Large").Id;

        colourOption.Id = savedColour.Id;
        colourOption.Values[0].Id = savedColour.ProductOptionValues.Single(v => v.Name == "Red").Id;
        colourOption.Values[1].Id = savedColour.ProductOptionValues.Single(v => v.Name == "Blue").Id;

        _fixture.DbContext.ChangeTracker.Clear();
        return (productRoot.Id, sizeOption, colourOption);
    }

    /// <summary>
    /// Gets all variants for a product root from the database.
    /// </summary>
    private async Task<List<Product>> GetVariants(Guid productRootId)
    {
        _fixture.DbContext.ChangeTracker.Clear();
        return await _fixture.DbContext.Products
            .Where(p => p.ProductRootId == productRootId)
            .OrderBy(p => p.Name)
            .ToListAsync();
    }

    #endregion

    [Fact]
    public async Task PreviewAddonPriceAsync_WithAddonSelection_ReturnsCalculatedTotal()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var optionId = Guid.NewGuid();
        var valueId = Guid.NewGuid();

        var productRoot = dataBuilder.CreateProductRoot("Art Print Poster");
        productRoot.ProductOptions =
        [
            new ProductOption
            {
                Id = optionId,
                Name = "Testing Add On",
                IsVariant = false,
                ProductOptionValues =
                [
                    new ProductOptionValue
                    {
                        Id = valueId,
                        Name = "Add On One",
                        PriceAdjustment = 10m,
                        CostAdjustment = 3m,
                        SkuSuffix = "ADD-1"
                    }
                ]
            }
        ];

        var variant = dataBuilder.CreateProduct("Art Print Poster - A4", productRoot, price: 19.99m);
        await dataBuilder.SaveChangesAsync();

        var request = new AddonPricePreviewRequestDto
        {
            SelectedAddons =
            [
                new AddonSelectionDto
                {
                    OptionId = optionId,
                    ValueId = valueId
                }
            ]
        };

        var result = await _productService.PreviewAddonPriceAsync(variant.Id, request);

        result.ShouldNotBeNull();
        result.BasePrice.ShouldBe(19.99m);
        result.AddonsTotal.ShouldBe(10m);
        result.TotalPrice.ShouldBe(29.99m);
    }

    [Fact]
    public async Task PreviewAddonPriceAsync_WithUnknownVariant_ReturnsNull()
    {
        var request = new AddonPricePreviewRequestDto
        {
            SelectedAddons = []
        };

        var result = await _productService.PreviewAddonPriceAsync(Guid.NewGuid(), request);

        result.ShouldBeNull();
    }

    [Fact]
    public async Task SaveProductOptions_AddonRequiredFlag_IsPersisted_AndIgnoredForVariantOptions()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var productRoot = dataBuilder.CreateProductRoot("Wall Art");
        dataBuilder.CreateProduct("Wall Art - Default", productRoot, price: 19.99m);
        await dataBuilder.SaveChangesAsync();

        var saveResult = await _productService.SaveProductOptions(productRoot.Id,
        [
            new SaveProductOptionDto
            {
                Name = "Frame Finish",
                SortOrder = 0,
                IsVariant = false,
                IsMultiSelect = true,
                IsRequired = true,
                Values =
                [
                    new SaveOptionValueDto
                    {
                        Name = "Matte Black",
                        SortOrder = 0,
                        PriceAdjustment = 8m,
                        CostAdjustment = 2m
                    }
                ]
            },
            new SaveProductOptionDto
            {
                Name = "Size",
                SortOrder = 1,
                IsVariant = true,
                IsMultiSelect = true,
                IsRequired = true,
                Values =
                [
                    new SaveOptionValueDto
                    {
                        Name = "Large",
                        SortOrder = 0
                    }
                ]
            }
        ]);

        saveResult.Success.ShouldBeTrue();
        saveResult.ResultObject.ShouldNotBeNull();

        var addonOption = saveResult.ResultObject.Single(o => !o.IsVariant);
        addonOption.IsRequired.ShouldBeTrue();
        addonOption.IsMultiSelect.ShouldBeTrue();

        var variantOption = saveResult.ResultObject.Single(o => o.IsVariant);
        variantOption.IsRequired.ShouldBeFalse();
        variantOption.IsMultiSelect.ShouldBeFalse();

        _fixture.DbContext.ChangeTracker.Clear();

        var reloaded = await _productService.GetProductRoot(productRoot.Id);
        reloaded.ShouldNotBeNull();

        var persistedAddonOption = reloaded.ProductOptions.Single(o => !o.IsVariant);
        persistedAddonOption.IsRequired.ShouldBeTrue();

        var persistedVariantOption = reloaded.ProductOptions.Single(o => o.IsVariant);
        persistedVariantOption.IsRequired.ShouldBeFalse();
        persistedVariantOption.IsMultiSelect.ShouldBeFalse();
    }

    [Fact]
    public async Task QueryProducts_WithMaxPriceFilter_FiltersWithoutSqliteCompareErrors()
    {
        var dataBuilder = _fixture.CreateDataBuilder();

        var lowRoot = dataBuilder.CreateProductRoot("Filtered Low Price Root");
        var lowVariant = dataBuilder.CreateProduct("Filtered Low Price Variant", lowRoot, price: 19.99m);

        var highRoot = dataBuilder.CreateProductRoot("Filtered High Price Root");
        dataBuilder.CreateProduct("Filtered High Price Variant", highRoot, price: 29.99m);

        await dataBuilder.SaveChangesAsync();

        var result = await _productService.QueryProducts(new ProductQueryParameters
        {
            ProductRootKeys = [lowRoot.Id, highRoot.Id],
            MaxPrice = 19.99m,
            OrderBy = ProductOrderBy.PriceAsc,
            CurrentPage = 1,
            AmountPerPage = 20,
            NoTracking = true
        });

        result.TotalItems.ShouldBe(1);
        result.Items.Count().ShouldBe(1);
        result.Items.Single().Id.ShouldBe(lowVariant.Id);
    }

    #region Variant Generation and Surgical Updates

    [Fact]
    public async Task SaveProductOptions_CreatesVariants_FromCartesianProduct()
    {
        // Arrange & Act: Setup creates Size(S/M/L) x Colour(Red/Blue) = 6 variants
        var (productRootId, _, _) = await SetupProductWithVariantOptions();
        var variants = await GetVariants(productRootId);

        // Assert: 6 variants from 3x2 Cartesian product
        variants.Count.ShouldBe(6);
        variants.ShouldContain(v => v.Name == "Small - Red");
        variants.ShouldContain(v => v.Name == "Small - Blue");
        variants.ShouldContain(v => v.Name == "Medium - Red");
        variants.ShouldContain(v => v.Name == "Medium - Blue");
        variants.ShouldContain(v => v.Name == "Large - Red");
        variants.ShouldContain(v => v.Name == "Large - Blue");

        // Exactly one default variant
        variants.Count(v => v.Default).ShouldBe(1);

        // All should have non-null VariantOptionsKey
        variants.ShouldAllBe(v => !string.IsNullOrEmpty(v.VariantOptionsKey));
    }

    [Fact]
    public async Task SaveProductOptions_RemoveOptionValue_DeletesOnlyAffectedVariants()
    {
        // Arrange: Size(S/M/L) x Colour(Red/Blue) = 6 variants
        var (productRootId, sizeOption, colourOption) = await SetupProductWithVariantOptions();

        var variantsBefore = await GetVariants(productRootId);
        variantsBefore.Count.ShouldBe(6);

        // Capture IDs of variants that should survive (Small and Medium variants)
        var survivorIds = variantsBefore
            .Where(v => v.Name!.StartsWith("Small") || v.Name!.StartsWith("Medium"))
            .Select(v => v.Id)
            .ToHashSet();
        survivorIds.Count.ShouldBe(4);

        // Act: Remove "Large" from Size option, keeping S/M only
        sizeOption.Values.RemoveAt(2); // Remove "Large"
        var result = await _productService.SaveProductOptions(productRootId, [sizeOption, colourOption]);

        // Assert
        result.Success.ShouldBeTrue();

        var variantsAfter = await GetVariants(productRootId);
        variantsAfter.Count.ShouldBe(4); // S/M x Red/Blue = 4

        // The surviving variants should have the same IDs (not regenerated)
        var survivorIdsAfter = variantsAfter.Select(v => v.Id).ToHashSet();
        survivorIdsAfter.SetEquals(survivorIds).ShouldBeTrue("Surviving variants should keep their original IDs");

        // No Large variants should remain
        variantsAfter.ShouldNotContain(v => v.Name!.Contains("Large"));
    }

    [Fact]
    public async Task SaveProductOptions_RemoveOptionValue_PreservesVariantData()
    {
        // Arrange: Size(S/M/L) x Colour(Red/Blue) = 6 variants
        var (productRootId, sizeOption, colourOption) = await SetupProductWithVariantOptions();

        // Set custom prices on a surviving variant (Small - Red)
        var variants = await GetVariants(productRootId);
        var smallRed = variants.Single(v => v.Name == "Small - Red");
        smallRed.Price = 49.99m;
        smallRed.CostOfGoods = 15m;
        await _fixture.DbContext.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act: Remove "Large" from Size option
        sizeOption.Values.RemoveAt(2);
        var result = await _productService.SaveProductOptions(productRootId, [sizeOption, colourOption]);
        result.Success.ShouldBeTrue();

        // Assert: Small - Red should retain custom pricing
        var variantsAfter = await GetVariants(productRootId);
        var smallRedAfter = variantsAfter.Single(v => v.Id == smallRed.Id);
        smallRedAfter.Price.ShouldBe(49.99m);
        smallRedAfter.CostOfGoods.ShouldBe(15m);
    }

    [Fact]
    public async Task SaveProductOptions_AddOptionValue_CreatesOnlyNewVariants()
    {
        // Arrange: Size(S/M/L) x Colour(Red/Blue) = 6 variants
        var (productRootId, sizeOption, colourOption) = await SetupProductWithVariantOptions();

        var variantsBefore = await GetVariants(productRootId);
        variantsBefore.Count.ShouldBe(6);
        var originalIds = variantsBefore.Select(v => v.Id).ToHashSet();

        // Act: Add "Green" to Colour option
        colourOption.Values.Add(new SaveOptionValueDto { Name = "Green", SortOrder = 2 });
        var result = await _productService.SaveProductOptions(productRootId, [sizeOption, colourOption]);

        // Assert
        result.Success.ShouldBeTrue();

        var variantsAfter = await GetVariants(productRootId);
        variantsAfter.Count.ShouldBe(9); // 3 sizes x 3 colours

        // All original variants should still exist with same IDs
        var afterIds = variantsAfter.Select(v => v.Id).ToHashSet();
        originalIds.All(id => afterIds.Contains(id)).ShouldBeTrue("All original variants should be preserved");

        // New Green variants should exist
        variantsAfter.ShouldContain(v => v.Name == "Small - Green");
        variantsAfter.ShouldContain(v => v.Name == "Medium - Green");
        variantsAfter.ShouldContain(v => v.Name == "Large - Green");
    }

    [Fact]
    public async Task SaveProductOptions_AddAndRemoveValues_Simultaneously()
    {
        // Arrange: Size(S/M/L) x Colour(Red/Blue) = 6 variants
        var (productRootId, sizeOption, colourOption) = await SetupProductWithVariantOptions();

        var variantsBefore = await GetVariants(productRootId);
        variantsBefore.Count.ShouldBe(6);

        // Capture IDs of Small/Medium + Red/Blue variants (should survive)
        var survivorIds = variantsBefore
            .Where(v => !v.Name!.Contains("Large"))
            .Select(v => v.Id)
            .ToHashSet();

        // Act: Remove "Large" from Size AND add "Green" to Colour
        sizeOption.Values.RemoveAt(2); // Remove Large
        colourOption.Values.Add(new SaveOptionValueDto { Name = "Green", SortOrder = 2 });
        var result = await _productService.SaveProductOptions(productRootId, [sizeOption, colourOption]);

        // Assert
        result.Success.ShouldBeTrue();

        var variantsAfter = await GetVariants(productRootId);
        // (S/M) x (Red/Blue/Green) = 6 variants
        variantsAfter.Count.ShouldBe(6);

        // Original Small/Medium + Red/Blue variants preserved
        survivorIds.All(id => variantsAfter.Any(v => v.Id == id)).ShouldBeTrue(
            "Small/Medium x Red/Blue variants should keep their original IDs");

        // Large variants removed
        variantsAfter.ShouldNotContain(v => v.Name!.Contains("Large"));

        // New Green variants created
        variantsAfter.ShouldContain(v => v.Name == "Small - Green");
        variantsAfter.ShouldContain(v => v.Name == "Medium - Green");
    }

    [Fact]
    public async Task SaveProductOptions_RemoveDefaultVariant_ReassignsDefault()
    {
        // Arrange: Size(S/M/L) x Colour(Red/Blue) = 6 variants
        var (productRootId, sizeOption, colourOption) = await SetupProductWithVariantOptions();

        var variants = await GetVariants(productRootId);
        var defaultVariant = variants.Single(v => v.Default);

        // Figure out which size value the default variant uses, then remove that value
        var defaultValueIds = defaultVariant.VariantOptionsKey!.Split(',').Select(Guid.Parse).ToHashSet();
        var sizeValueToRemove = sizeOption.Values.First(v => defaultValueIds.Contains(v.Id!.Value));
        sizeOption.Values.Remove(sizeValueToRemove);

        // Act
        var result = await _productService.SaveProductOptions(productRootId, [sizeOption, colourOption]);
        result.Success.ShouldBeTrue();

        // Assert: exactly one default variant exists
        var variantsAfter = await GetVariants(productRootId);
        variantsAfter.Count(v => v.Default).ShouldBe(1);
    }

    [Fact]
    public async Task SaveProductOptions_MetadataOnlyChange_DoesNotRegenerateVariants()
    {
        // Arrange: Size(S/M/L) x Colour(Red/Blue) = 6 variants
        var (productRootId, sizeOption, colourOption) = await SetupProductWithVariantOptions();

        var variantsBefore = await GetVariants(productRootId);
        var originalIds = variantsBefore.Select(v => v.Id).OrderBy(id => id).ToList();

        // Act: Change option name only (metadata, not structure)
        sizeOption.Name = "Product Size";
        var result = await _productService.SaveProductOptions(productRootId, [sizeOption, colourOption]);
        result.Success.ShouldBeTrue();

        // Assert: same variants, same IDs
        var variantsAfter = await GetVariants(productRootId);
        var afterIds = variantsAfter.Select(v => v.Id).OrderBy(id => id).ToList();
        afterIds.ShouldBe(originalIds);
    }

    [Fact]
    public async Task SaveProductOptions_AddNewOption_TriggersFullRegeneration()
    {
        // Arrange: Size(S/M/L) x Colour(Red/Blue) = 6 variants
        var (productRootId, sizeOption, colourOption) = await SetupProductWithVariantOptions();

        // Act: Add a third variant option (Material)
        var materialOption = new SaveProductOptionDto
        {
            Name = "Material",
            SortOrder = 2,
            IsVariant = true,
            Values =
            [
                new SaveOptionValueDto { Name = "Cotton", SortOrder = 0 },
                new SaveOptionValueDto { Name = "Polyester", SortOrder = 1 }
            ]
        };
        var result = await _productService.SaveProductOptions(productRootId, [sizeOption, colourOption, materialOption]);
        result.Success.ShouldBeTrue();

        // Assert: 3x2x2 = 12 variants (full regeneration)
        var variantsAfter = await GetVariants(productRootId);
        variantsAfter.Count.ShouldBe(12);
        variantsAfter.ShouldContain(v => v.Name == "Small - Red - Cotton");
        variantsAfter.ShouldContain(v => v.Name == "Large - Blue - Polyester");
    }

    [Fact]
    public async Task SaveProductOptions_RemoveEntireOption_TriggersFullRegeneration()
    {
        // Arrange: Size(S/M/L) x Colour(Red/Blue) = 6 variants
        var (productRootId, sizeOption, _) = await SetupProductWithVariantOptions();

        // Act: Remove Colour option entirely (send only Size)
        var result = await _productService.SaveProductOptions(productRootId, [sizeOption]);
        result.Success.ShouldBeTrue();

        // Assert: 3 variants (Size only: S/M/L)
        var variantsAfter = await GetVariants(productRootId);
        variantsAfter.Count.ShouldBe(3);
        variantsAfter.ShouldContain(v => v.Name == "Small");
        variantsAfter.ShouldContain(v => v.Name == "Medium");
        variantsAfter.ShouldContain(v => v.Name == "Large");
    }

    [Fact]
    public async Task SaveProductOptions_RemoveAllVariantOptions_CollapsesToSingleVariant()
    {
        // Arrange: Size(S/M/L) x Colour(Red/Blue) = 6 variants
        var (productRootId, _, _) = await SetupProductWithVariantOptions();

        // Act: Send empty options (remove all)
        var result = await _productService.SaveProductOptions(productRootId, []);
        result.Success.ShouldBeTrue();

        // Assert: single default variant
        var variantsAfter = await GetVariants(productRootId);
        variantsAfter.Count.ShouldBe(1);
        variantsAfter.Single().Default.ShouldBeTrue();
        variantsAfter.Single().VariantOptionsKey.ShouldBeNull();
    }

    [Fact]
    public async Task SaveProductOptions_EmptyVariantOption_ReturnsError()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var productRoot = dataBuilder.CreateProductRoot("Error Test Product");
        dataBuilder.CreateProduct("Error Test - Default", productRoot, price: 10m);
        await dataBuilder.SaveChangesAsync();

        // Act: Try to save a variant option with no values
        var result = await _productService.SaveProductOptions(productRoot.Id,
        [
            new SaveProductOptionDto
            {
                Name = "Empty Option",
                SortOrder = 0,
                IsVariant = true,
                Values = [] // No values
            }
        ]);

        // Assert
        result.Success.ShouldBeFalse();
        result.Messages.ShouldContain(m => (m.Message ?? "").Contains("must have at least one value"));
    }

    [Fact]
    public async Task SaveProductOptions_ReplaceAllValuesInOption_RetainsTemplatePricing()
    {
        // Arrange: Size(S/M/L) x Colour(Red/Blue) = 6 variants
        var (productRootId, sizeOption, colourOption) = await SetupProductWithVariantOptions();

        // Set custom pricing on the default variant so we can verify it's used as template
        var variants = await GetVariants(productRootId);
        var defaultVariant = variants.Single(v => v.Default);
        defaultVariant.Price = 75m;
        defaultVariant.CostOfGoods = 25m;
        await _fixture.DbContext.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act: Replace ALL colour values (Red/Blue -> Green/Yellow)
        // This removes all 6 variants then creates 6 new ones
        colourOption.Values.Clear();
        colourOption.Values.Add(new SaveOptionValueDto { Name = "Green", SortOrder = 0 });
        colourOption.Values.Add(new SaveOptionValueDto { Name = "Yellow", SortOrder = 1 });
        var result = await _productService.SaveProductOptions(productRootId, [sizeOption, colourOption]);

        // Assert: new variants should exist with template pricing, not 0
        result.Success.ShouldBeTrue();

        var variantsAfter = await GetVariants(productRootId);
        variantsAfter.Count.ShouldBe(6); // 3 sizes x 2 new colours
        variantsAfter.ShouldContain(v => v.Name == "Small - Green");
        variantsAfter.ShouldContain(v => v.Name == "Large - Yellow");

        // All new variants should inherit template pricing, not fall back to 0
        variantsAfter.ShouldAllBe(v => v.Price == 75m);
        variantsAfter.ShouldAllBe(v => v.CostOfGoods == 25m);
    }

    [Fact]
    public async Task SaveProductOptions_AddValue_DetectsSkuCollisionWithSurvivingVariant()
    {
        // Arrange: Size(S/M/L) x Colour(Red/Blue) = 6 variants
        var (productRootId, sizeOption, colourOption) = await SetupProductWithVariantOptions();

        // Manually set a surviving variant's SKU to what "Green" would generate,
        // so that the new "Green" variant collides with the surviving variant's SKU
        var variants = await GetVariants(productRootId);
        var smallRed = variants.Single(v => v.Name == "Small - Red");
        // The surgical path generates SKUs as slug of "{RootName} - {Size} - {Colour}"
        // so "Small - Green" would become "TEST-CHAIR-SMALL-GREEN"
        smallRed.Sku = "TEST-CHAIR-SMALL-GREEN";
        await _fixture.DbContext.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act: Add "Green" to Colour option — should collide with Small-Red's rigged SKU
        colourOption.Values.Add(new SaveOptionValueDto { Name = "Green", SortOrder = 2 });
        var result = await _productService.SaveProductOptions(productRootId, [sizeOption, colourOption]);

        // Assert: options save succeeds but variant update reports SKU conflict as a warning
        result.Success.ShouldBeTrue();
        result.Messages.ShouldContain(m => (m.Message ?? "").Contains("SKU"));

        // Only the original 6 variants should remain (no new Green variants created)
        var variantsAfter = await GetVariants(productRootId);
        variantsAfter.Count.ShouldBe(6);
        variantsAfter.ShouldNotContain(v => v.Name!.Contains("Green"));
    }

    [Fact]
    public async Task SaveProductOptions_FullRegeneration_SkuDuplicateCheckDoesNotBlockOwnSkus()
    {
        // This tests the SKU duplicate check fix: own product's SKUs should not cause false conflicts
        // Arrange: Create initial variants
        var (productRootId, sizeOption, colourOption) = await SetupProductWithVariantOptions();

        // Act: Remove Colour entirely, forcing full regeneration where Size-only SKUs
        // overlap with the old Size-Colour SKU prefixes
        var result = await _productService.SaveProductOptions(productRootId, [sizeOption]);

        // Assert: Should succeed (not fail with "duplicate SKU" error)
        result.Success.ShouldBeTrue();
        var variantsAfter = await GetVariants(productRootId);
        variantsAfter.Count.ShouldBe(3);
    }

    #endregion
}
