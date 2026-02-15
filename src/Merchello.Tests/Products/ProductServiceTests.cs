using Merchello.Core.Products.Dtos;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Products.Services.Parameters;
using Merchello.Core.Shared.Dtos;
using Merchello.Tests.TestInfrastructure;
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
}
