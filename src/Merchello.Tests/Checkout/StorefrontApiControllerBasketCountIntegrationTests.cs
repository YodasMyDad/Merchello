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
using Merchello.Core.Storefront.Models;
using Merchello.Core.Storefront.Services.Interfaces;
using Merchello.Core.Warehouses.Services.Interfaces;
using Merchello.Services;
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
    private readonly IProductService _productService;
    private readonly ICurrencyService _currencyService;
    private readonly IStorefrontDtoMapper _storefrontDtoMapper;
    private readonly IOptions<MerchelloSettings> _settings;

    public StorefrontApiControllerBasketCountIntegrationTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _fixture.MockHttpContext.ClearSession();
        _checkoutService = fixture.GetService<ICheckoutService>();
        _productService = fixture.GetService<IProductService>();
        _currencyService = fixture.GetService<ICurrencyService>();
        _storefrontDtoMapper = new StorefrontDtoMapper(
            _currencyService,
            fixture.GetService<ICurrencyConversionService>());
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

    [Fact]
    public async Task GetBasket_ReturnsDependentLineItemSkuJsonField()
    {
        var seeded = await SeedProductWithTwoAddonsAsync();
        var controller = CreateController(CreateStorefrontContextMockForDisplay().Object);

        await controller.AddToBasket(new AddToBasketDto
        {
            ProductId = seeded.ProductId,
            Quantity = 1,
            Addons =
            [
                new AddonSelectionDto { OptionId = seeded.OptionId, ValueId = seeded.FirstAddonValueId }
            ]
        }, CancellationToken.None);

        var result = await controller.GetBasket(CancellationToken.None);
        var ok = result.ShouldBeOfType<OkObjectResult>();
        var dto = ok.Value.ShouldBeOfType<StorefrontBasketDto>();
        dto.Items.Count.ShouldBeGreaterThan(0);

        var json = System.Text.Json.JsonSerializer.Serialize(dto, new System.Text.Json.JsonSerializerOptions
        {
            PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase
        });
        json.ShouldContain("dependentLineItemSku");
        json.ShouldNotContain("dependantLineItemSku");
    }

    [Fact]
    public async Task GetProductAvailability_ReturnsCanShipToLocationJsonField()
    {
        var seeded = await SeedProductWithTwoAddonsAsync();
        var storefrontContextMock = CreateStorefrontContextMockForDisplay();
        storefrontContextMock
            .Setup(x => x.GetProductAvailabilityAsync(
                It.IsAny<Merchello.Core.Products.Models.Product>(),
                It.IsAny<int>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ProductLocationAvailability(
                CanShipToLocation: true,
                HasStock: true,
                AvailableStock: 7,
                StatusMessage: "In stock",
                ShowStockLevels: true));

        var controller = CreateController(storefrontContextMock.Object);

        var result = await controller.GetProductAvailability(
            seeded.ProductId,
            null,
            null,
            quantity: 1,
            ct: CancellationToken.None);

        var ok = result.ShouldBeOfType<OkObjectResult>();
        var dto = ok.Value.ShouldBeOfType<ProductAvailabilityDto>();
        dto.CanShipToLocation.ShouldBeTrue();

        var json = System.Text.Json.JsonSerializer.Serialize(dto, new System.Text.Json.JsonSerializerOptions
        {
            PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase
        });
        json.ShouldContain("canShipToLocation");
        json.ShouldNotContain("canShipToCountry");
    }

    [Fact]
    public async Task GetBasketAvailability_ReturnsCanShipToLocationJsonField()
    {
        var lineItemId = Guid.NewGuid();
        var productId = Guid.NewGuid();

        var storefrontContextMock = CreateStorefrontContextMockForDisplay();
        storefrontContextMock
            .Setup(x => x.GetBasketAvailabilityAsync(
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new BasketLocationAvailability(
                AllItemsAvailable: false,
                Items:
                [
                    new BasketItemLocationAvailability(
                        LineItemId: lineItemId,
                        ProductId: productId,
                        CanShipToLocation: false,
                        HasStock: true,
                        StatusMessage: "Not available in selected location")
                ]));

        var controller = CreateController(storefrontContextMock.Object);

        var result = await controller.GetBasketAvailability("US", "CA", CancellationToken.None);
        var ok = result.ShouldBeOfType<OkObjectResult>();
        var dto = ok.Value.ShouldBeOfType<BasketAvailabilityDto>();
        dto.AllItemsAvailable.ShouldBeFalse();
        dto.Items.Count.ShouldBe(1);
        dto.Items[0].CanShipToLocation.ShouldBeFalse();

        var json = System.Text.Json.JsonSerializer.Serialize(dto, new System.Text.Json.JsonSerializerOptions
        {
            PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase
        });
        json.ShouldContain("canShipToLocation");
        json.ShouldNotContain("canShipToCountry");
    }

    [Fact]
    public async Task GetBasket_WithIncludeAvailabilityTrue_ReturnsItemAvailabilityMap()
    {
        var seeded = await SeedProductWithTwoAddonsAsync();
        var storefrontContextMock = CreateStorefrontContextMockForDisplay();

        await CreateController(storefrontContextMock.Object).AddToBasket(new AddToBasketDto
        {
            ProductId = seeded.ProductId,
            Quantity = 1,
            Addons = []
        }, CancellationToken.None);

        var basket = await _checkoutService.GetBasket(new GetBasketParameters(), CancellationToken.None);
        basket.ShouldNotBeNull();
        var productLineItem = basket!.LineItems.Single(li => li.LineItemType == LineItemType.Product);

        storefrontContextMock
            .Setup(x => x.GetBasketAvailabilityAsync(
                It.IsAny<IReadOnlyList<LineItem>>(),
                "US",
                "CA",
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new BasketLocationAvailability(
                AllItemsAvailable: true,
                Items:
                [
                    new BasketItemLocationAvailability(
                        LineItemId: productLineItem.Id,
                        ProductId: seeded.ProductId,
                        CanShipToLocation: true,
                        HasStock: true,
                        StatusMessage: "In stock")
                ]));

        var controller = CreateController(storefrontContextMock.Object);
        var result = await controller.GetBasket(CancellationToken.None, includeAvailability: true, countryCode: "US", regionCode: "CA");
        var ok = result.ShouldBeOfType<OkObjectResult>();
        var dto = ok.Value.ShouldBeOfType<StorefrontBasketDto>();
        dto.ItemAvailability.Count.ShouldBe(1);
        dto.ItemAvailability.ContainsKey(productLineItem.Id.ToString()).ShouldBeTrue();
        dto.ItemAvailability[productLineItem.Id.ToString()].CanShipToLocation.ShouldBeTrue();
    }

    [Fact]
    public async Task GetContext_ReturnsLocationCurrencyAndBasketSummary()
    {
        var storefrontContextMock = new Mock<IStorefrontContextService>();
        storefrontContextMock
            .Setup(x => x.GetShippingLocationAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ShippingLocation("US", "United States", "CA", "California"));
        storefrontContextMock
            .Setup(x => x.GetCurrencyAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new StorefrontCurrency("USD", "$", 2));

        var controller = CreateController(storefrontContextMock.Object);
        var result = await controller.GetContext(CancellationToken.None);

        var ok = result.ShouldBeOfType<OkObjectResult>();
        var dto = ok.Value.ShouldBeOfType<StorefrontContextDto>();
        dto.Country.Code.ShouldBe("US");
        dto.Currency.CurrencyCode.ShouldBe("USD");
        dto.Basket.ItemCount.ShouldBeGreaterThanOrEqualTo(0);
    }

    [Fact]
    public async Task ClearBasket_RemovesCurrentBasket()
    {
        var seeded = await SeedProductWithTwoAddonsAsync();
        var controller = CreateController();

        await controller.AddToBasket(new AddToBasketDto
        {
            ProductId = seeded.ProductId,
            Quantity = 2,
            Addons = []
        }, CancellationToken.None);

        var clearResult = await controller.ClearBasket(CancellationToken.None);
        var clearOk = clearResult.ShouldBeOfType<OkObjectResult>();
        var clearDto = clearOk.Value.ShouldBeOfType<BasketOperationResultDto>();
        clearDto.Success.ShouldBeTrue();
        clearDto.ItemCount.ShouldBe(0);

        // Simulate a new request scope so per-request basket cache is not reused.
        _fixture.MockHttpContext.ClearSession();

        var countResult = await controller.GetBasketCount(CancellationToken.None);
        var countOk = countResult.ShouldBeOfType<OkObjectResult>();
        var countDto = countOk.Value.ShouldBeOfType<BasketCountDto>();
        countDto.ItemCount.ShouldBe(0);
    }

    private StorefrontApiController CreateController(
        IStorefrontContextService? storefrontContext = null,
        IProductService? productService = null)
    {
        return new StorefrontApiController(
            _checkoutService,
            storefrontContext ?? Mock.Of<IStorefrontContextService>(),
            productService ?? _productService,
            Mock.Of<ILocationsService>(),
            _currencyService,
            _storefrontDtoMapper,
            _settings);
    }

    private static Mock<IStorefrontContextService> CreateStorefrontContextMockForDisplay()
    {
        var mock = new Mock<IStorefrontContextService>();
        mock
            .Setup(x => x.GetDisplayContextAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new StorefrontDisplayContext(
                CurrencyCode: "USD",
                CurrencySymbol: "$",
                DecimalPlaces: 2,
                ExchangeRate: 1m,
                StoreCurrencyCode: "USD",
                DisplayPricesIncTax: false,
                TaxCountryCode: "US",
                TaxRegionCode: null));

        return mock;
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
