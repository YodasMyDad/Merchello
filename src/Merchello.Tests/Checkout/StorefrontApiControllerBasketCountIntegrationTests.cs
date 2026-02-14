using Merchello.Controllers;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Products.Factories;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shared.Dtos;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Storefront.Dtos;
using Merchello.Core.Storefront.Services.Interfaces;
using Merchello.Core.Warehouses.Services.Interfaces;
using Merchello.Tests.TestInfrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Checkout;

[Collection("Integration Tests")]
public class StorefrontApiControllerBasketCountIntegrationTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly ICheckoutService _checkoutService;
    private readonly IOptions<MerchelloSettings> _settings;

    public StorefrontApiControllerBasketCountIntegrationTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _fixture.MockHttpContext.ClearSession();
        _checkoutService = fixture.GetService<ICheckoutService>();
        _settings = fixture.GetService<IOptions<MerchelloSettings>>();
    }

    [Fact]
    public async Task AddToBasket_WithLinkedAddons_ReturnsParentOnlyItemCount()
    {
        var product = await SeedProductWithTwoAddonsAsync();
        var controller = CreateController();

        var result = await controller.AddToBasket(new AddToBasketDto
        {
            ProductId = product.ProductId,
            Quantity = 1,
            Addons =
            [
                new AddonSelectionDto { OptionId = product.OptionId, ValueId = product.FirstAddonValueId },
                new AddonSelectionDto { OptionId = product.OptionId, ValueId = product.SecondAddonValueId }
            ]
        }, CancellationToken.None);

        var ok = result.ShouldBeOfType<OkObjectResult>();
        var dto = ok.Value.ShouldBeOfType<BasketOperationResultDto>();
        dto.Success.ShouldBeTrue();
        dto.ItemCount.ShouldBe(1);

        var basket = await _checkoutService.GetBasket(new GetBasketParameters(), CancellationToken.None);
        basket.ShouldNotBeNull();
        basket!.LineItems.Count(li => li.LineItemType == LineItemType.Product).ShouldBe(1);
        basket.LineItems.Count(li => li.LineItemType == LineItemType.Addon).ShouldBe(2);
    }

    [Fact]
    public async Task GetBasketCount_AfterParentQuantityUpdate_ReturnsUpdatedParentQuantityOnly()
    {
        var product = await SeedProductWithTwoAddonsAsync();
        var controller = CreateController();

        await controller.AddToBasket(new AddToBasketDto
        {
            ProductId = product.ProductId,
            Quantity = 1,
            Addons =
            [
                new AddonSelectionDto { OptionId = product.OptionId, ValueId = product.FirstAddonValueId },
                new AddonSelectionDto { OptionId = product.OptionId, ValueId = product.SecondAddonValueId }
            ]
        }, CancellationToken.None);

        var basket = await _checkoutService.GetBasket(new GetBasketParameters(), CancellationToken.None);
        basket.ShouldNotBeNull();
        var parentLineItem = basket!.LineItems.Single(li => li.LineItemType == LineItemType.Product);

        var updateResult = await controller.UpdateQuantity(new UpdateQuantityDto
        {
            LineItemId = parentLineItem.Id,
            Quantity = 3
        }, CancellationToken.None);

        var updateOk = updateResult.ShouldBeOfType<OkObjectResult>();
        var updateDto = updateOk.Value.ShouldBeOfType<BasketOperationResultDto>();
        updateDto.ItemCount.ShouldBe(3);

        var countResult = await controller.GetBasketCount(CancellationToken.None);
        var countOk = countResult.ShouldBeOfType<OkObjectResult>();
        var countDto = countOk.Value.ShouldBeOfType<BasketCountDto>();
        countDto.ItemCount.ShouldBe(3);
    }

    [Fact]
    public async Task RemoveAddonLineItem_DoesNotReduceStorefrontItemCount()
    {
        var product = await SeedProductWithTwoAddonsAsync();
        var controller = CreateController();

        await controller.AddToBasket(new AddToBasketDto
        {
            ProductId = product.ProductId,
            Quantity = 1,
            Addons =
            [
                new AddonSelectionDto { OptionId = product.OptionId, ValueId = product.FirstAddonValueId },
                new AddonSelectionDto { OptionId = product.OptionId, ValueId = product.SecondAddonValueId }
            ]
        }, CancellationToken.None);

        var basket = await _checkoutService.GetBasket(new GetBasketParameters(), CancellationToken.None);
        basket.ShouldNotBeNull();
        var addonLineItem = basket!.LineItems.First(li => li.LineItemType == LineItemType.Addon);

        var removeResult = await controller.RemoveItem(addonLineItem.Id, CancellationToken.None);
        var removeOk = removeResult.ShouldBeOfType<OkObjectResult>();
        var removeDto = removeOk.Value.ShouldBeOfType<BasketOperationResultDto>();
        removeDto.ItemCount.ShouldBe(1);

        var countResult = await controller.GetBasketCount(CancellationToken.None);
        var countOk = countResult.ShouldBeOfType<OkObjectResult>();
        var countDto = countOk.Value.ShouldBeOfType<BasketCountDto>();
        countDto.ItemCount.ShouldBe(1);
    }

    [Fact]
    public async Task AddToBasket_MissingRequiredAddon_ReturnsBadRequest()
    {
        var product = await SeedProductWithRequiredSingleSelectAddonAsync();
        var controller = CreateController();

        var result = await controller.AddToBasket(new AddToBasketDto
        {
            ProductId = product.ProductId,
            Quantity = 1,
            Addons = []
        }, CancellationToken.None);

        var badRequest = result.ShouldBeOfType<BadRequestObjectResult>();
        var dto = badRequest.Value.ShouldBeOfType<BasketOperationResultDto>();
        dto.Success.ShouldBeFalse();
        dto.Message.ShouldNotBeNull();
        dto.Message.ShouldContain("required add-on");
    }

    [Fact]
    public async Task AddToBasket_SingleSelectAddonMultipleValues_ReturnsBadRequest()
    {
        var product = await SeedProductWithRequiredSingleSelectAddonAsync();
        var controller = CreateController();

        var result = await controller.AddToBasket(new AddToBasketDto
        {
            ProductId = product.ProductId,
            Quantity = 1,
            Addons =
            [
                new AddonSelectionDto { OptionId = product.OptionId, ValueId = product.FirstAddonValueId },
                new AddonSelectionDto { OptionId = product.OptionId, ValueId = product.SecondAddonValueId }
            ]
        }, CancellationToken.None);

        var badRequest = result.ShouldBeOfType<BadRequestObjectResult>();
        var dto = badRequest.Value.ShouldBeOfType<BasketOperationResultDto>();
        dto.Success.ShouldBeFalse();
        dto.Message.ShouldNotBeNull();
        dto.Message.ShouldContain("only allows one selection");
    }

    private StorefrontApiController CreateController()
    {
        return new StorefrontApiController(
            _checkoutService,
            Mock.Of<IStorefrontContextService>(),
            Mock.Of<IProductService>(),
            Mock.Of<ILocationsService>(),
            Mock.Of<ICurrencyService>(),
            Mock.Of<ICurrencyConversionService>(),
            _settings);
    }

    private async Task<(Guid ProductId, Guid OptionId, Guid FirstAddonValueId, Guid SecondAddonValueId)> SeedProductWithTwoAddonsAsync()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var taxGroup = dataBuilder.CreateTaxGroup("Standard VAT", 20m);
        var productRoot = dataBuilder.CreateProductRoot("Jasmine Contract Zip & Link Bed", taxGroup);
        var product = dataBuilder.CreateProduct("Jasmine Contract Zip & Link Bed - Slate", productRoot, price: 451.73m);
        product.Sku = "JASMINE-CONTRACT-ZIP-LINK-BED-SLATE";

        var optionFactory = new ProductOptionFactory();
        var addonOption = optionFactory.CreateEmpty();
        addonOption.Name = "Add-ons";
        addonOption.Alias = "addons";
        addonOption.IsVariant = false;
        addonOption.IsMultiSelect = true;

        var firstAddon = optionFactory.CreateEmptyValue();
        firstAddon.Name = "Add Stainguard Vinyl: Yes";
        firstAddon.PriceAdjustment = 48m;

        var secondAddon = optionFactory.CreateEmptyValue();
        secondAddon.Name = "Choose Storage Option: Four Drawers";
        secondAddon.PriceAdjustment = 96m;

        addonOption.ProductOptionValues = [firstAddon, secondAddon];
        productRoot.ProductOptions = [addonOption];

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        return (product.Id, addonOption.Id, firstAddon.Id, secondAddon.Id);
    }

    private async Task<(Guid ProductId, Guid OptionId, Guid FirstAddonValueId, Guid SecondAddonValueId)> SeedProductWithRequiredSingleSelectAddonAsync()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var taxGroup = dataBuilder.CreateTaxGroup("Reduced VAT", 5m);
        var productRoot = dataBuilder.CreateProductRoot("Poster Print", taxGroup);
        var product = dataBuilder.CreateProduct("Poster Print - Standard", productRoot, price: 39.99m);
        product.Sku = "POSTER-PRINT-STANDARD";

        var optionFactory = new ProductOptionFactory();
        var addonOption = optionFactory.CreateEmpty();
        addonOption.Name = "Frame";
        addonOption.Alias = "frame";
        addonOption.IsVariant = false;
        addonOption.IsMultiSelect = false;
        addonOption.IsRequired = true;

        var firstAddon = optionFactory.CreateEmptyValue();
        firstAddon.Name = "Black Frame";
        firstAddon.PriceAdjustment = 10m;

        var secondAddon = optionFactory.CreateEmptyValue();
        secondAddon.Name = "White Frame";
        secondAddon.PriceAdjustment = 12m;

        addonOption.ProductOptionValues = [firstAddon, secondAddon];
        productRoot.ProductOptions = [addonOption];

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        return (product.Id, addonOption.Id, firstAddon.Id, secondAddon.Id);
    }
}
