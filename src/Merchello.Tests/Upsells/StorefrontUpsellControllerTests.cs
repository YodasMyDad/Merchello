using Merchello.Controllers;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Factories;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Locality.Models;
using Merchello.Core.Storefront.Models;
using Merchello.Core.Storefront.Services.Interfaces;
using Merchello.Core.Upsells.Dtos;
using Merchello.Core.Upsells.Models;
using Merchello.Core.Upsells.Services.Interfaces;
using Merchello.Services;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Shouldly;
using Umbraco.Cms.Core.Media;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Strings;
using Xunit;

namespace Merchello.Tests.Upsells;

public class StorefrontUpsellControllerTests
{
    private readonly Mock<IUpsellEngine> _upsellEngineMock = new();
    private readonly Mock<IUpsellAnalyticsService> _analyticsServiceMock = new();
    private readonly Mock<ICheckoutService> _checkoutServiceMock = new();
    private readonly Mock<IUpsellContextBuilder> _upsellContextBuilderMock = new();
    private readonly Mock<IStorefrontContextService> _storefrontContextServiceMock = new();
    private readonly Mock<ICheckoutSessionService> _checkoutSessionServiceMock = new();
    private readonly Mock<IMediaService> _mediaServiceMock = new();
    private readonly Mock<IRichTextRenderer> _richTextRendererMock = new();
    private readonly StorefrontUpsellController _controller;

    public StorefrontUpsellControllerTests()
    {
        _richTextRendererMock
            .Setup(x => x.Render(It.IsAny<string?>()))
            .Returns<string?>(value => new HtmlEncodedString(value ?? string.Empty));

        _upsellEngineMock
            .Setup(x => x.GetSuggestionsForLocationAsync(
                It.IsAny<UpsellContext>(),
                It.IsAny<UpsellDisplayLocation>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        var mediaUrlGenerators = new MediaUrlGeneratorCollection(() => []);

        _controller = new StorefrontUpsellController(
            _upsellEngineMock.Object,
            _analyticsServiceMock.Object,
            _checkoutServiceMock.Object,
            _upsellContextBuilderMock.Object,
            _storefrontContextServiceMock.Object,
            _checkoutSessionServiceMock.Object,
            _mediaServiceMock.Object,
            mediaUrlGenerators,
            _richTextRendererMock.Object);
    }

    [Fact]
    public async Task GetSuggestions_WithQueryOverrides_UsesOverridesForUpsellAndDisplayContext()
    {
        var basket = CreateBasket("de", "be");
        var displayContext = CreateDisplayContext("gb", "lnd");
        var contextItems = new List<UpsellContextLineItem> { CreateContextLineItem() };
        UpsellContext? capturedContext = null;

        _checkoutServiceMock
            .Setup(x => x.GetBasket(It.IsAny<GetBasketParameters>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(basket);
        _upsellContextBuilderMock
            .Setup(x => x.BuildLineItemsAsync(It.IsAny<IEnumerable<LineItem>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(contextItems);
        _storefrontContextServiceMock
            .Setup(x => x.GetDisplayContextAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(displayContext);
        _upsellEngineMock
            .Setup(x => x.GetSuggestionsForLocationAsync(
                It.IsAny<UpsellContext>(),
                It.IsAny<UpsellDisplayLocation>(),
                It.IsAny<CancellationToken>()))
            .Callback<UpsellContext, UpsellDisplayLocation, CancellationToken>((context, _, _) => capturedContext = context)
            .ReturnsAsync([]);

        var result = await _controller.GetSuggestions(
            UpsellDisplayLocation.Basket,
            " us ",
            " ny ",
            CancellationToken.None);

        var ok = result.ShouldBeOfType<OkObjectResult>();
        var payload = ok.Value.ShouldBeOfType<List<UpsellSuggestionDto>>();
        payload.ShouldBeEmpty();

        capturedContext.ShouldNotBeNull();
        capturedContext!.CountryCode.ShouldBe("US");
        capturedContext.RegionCode.ShouldBe("NY");
        capturedContext.DisplayContext.ShouldNotBeNull();
        capturedContext.DisplayContext!.TaxCountryCode.ShouldBe("US");
        capturedContext.DisplayContext.TaxRegionCode.ShouldBe("NY");
        capturedContext.DisplayContext.CurrencyCode.ShouldBe(displayContext.CurrencyCode);
        capturedContext.DisplayContext.ExchangeRate.ShouldBe(displayContext.ExchangeRate);

        _checkoutSessionServiceMock.Verify(x => x.AddUpsellImpressionsAsync(
            It.IsAny<AddUpsellImpressionsParameters>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetSuggestions_WithoutQueryOverrides_UsesShippingCountryAndDisplayFallbackRegion()
    {
        var basket = CreateBasket(" ca ", null);
        var displayContext = CreateDisplayContext("gb", "qc");
        UpsellContext? capturedContext = null;

        _checkoutServiceMock
            .Setup(x => x.GetBasket(It.IsAny<GetBasketParameters>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(basket);
        _upsellContextBuilderMock
            .Setup(x => x.BuildLineItemsAsync(It.IsAny<IEnumerable<LineItem>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([CreateContextLineItem()]);
        _storefrontContextServiceMock
            .Setup(x => x.GetDisplayContextAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(displayContext);
        _upsellEngineMock
            .Setup(x => x.GetSuggestionsForLocationAsync(
                It.IsAny<UpsellContext>(),
                It.IsAny<UpsellDisplayLocation>(),
                It.IsAny<CancellationToken>()))
            .Callback<UpsellContext, UpsellDisplayLocation, CancellationToken>((context, _, _) => capturedContext = context)
            .ReturnsAsync([]);

        await _controller.GetSuggestions(
            UpsellDisplayLocation.Checkout,
            null,
            null,
            CancellationToken.None);

        capturedContext.ShouldNotBeNull();
        capturedContext!.CountryCode.ShouldBe("CA");
        capturedContext.RegionCode.ShouldBe("QC");
        capturedContext.DisplayContext.ShouldNotBeNull();
        capturedContext.DisplayContext!.TaxCountryCode.ShouldBe("CA");
        capturedContext.DisplayContext.TaxRegionCode.ShouldBe("QC");
    }

    [Fact]
    public async Task GetProductSuggestions_WithQueryOverrides_UsesOverridesForUpsellAndDisplayContext()
    {
        var displayContext = CreateDisplayContext("gb", "lnd");
        var location = new ShippingLocation("fr", "France", "idf", "Ile-de-France");
        var productId = Guid.NewGuid();
        UpsellContext? capturedContext = null;
        UpsellDisplayLocation? capturedLocation = null;

        _upsellContextBuilderMock
            .Setup(x => x.BuildLineItemAsync(productId, 1, 0m, It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateContextLineItem(productId));
        _storefrontContextServiceMock
            .Setup(x => x.GetDisplayContextAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(displayContext);
        _storefrontContextServiceMock
            .Setup(x => x.GetShippingLocationAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(location);
        _upsellEngineMock
            .Setup(x => x.GetSuggestionsForLocationAsync(
                It.IsAny<UpsellContext>(),
                It.IsAny<UpsellDisplayLocation>(),
                It.IsAny<CancellationToken>()))
            .Callback<UpsellContext, UpsellDisplayLocation, CancellationToken>((context, requestedLocation, _) =>
            {
                capturedContext = context;
                capturedLocation = requestedLocation;
            })
            .ReturnsAsync([]);

        var result = await _controller.GetProductSuggestions(
            productId,
            " jp ",
            " 13 ",
            CancellationToken.None);

        var ok = result.ShouldBeOfType<OkObjectResult>();
        var payload = ok.Value.ShouldBeOfType<List<UpsellSuggestionDto>>();
        payload.ShouldBeEmpty();

        capturedLocation.ShouldBe(UpsellDisplayLocation.ProductPage);
        capturedContext.ShouldNotBeNull();
        capturedContext!.Location.ShouldBe(UpsellDisplayLocation.ProductPage);
        capturedContext.CountryCode.ShouldBe("JP");
        capturedContext.RegionCode.ShouldBe("13");
        capturedContext.DisplayContext.ShouldNotBeNull();
        capturedContext.DisplayContext!.TaxCountryCode.ShouldBe("JP");
        capturedContext.DisplayContext.TaxRegionCode.ShouldBe("13");

        _storefrontContextServiceMock.Verify(
            x => x.GetShippingLocationAsync(It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task GetProductSuggestions_WithoutQueryOverrides_UsesLocationAndDisplayFallbackRegion()
    {
        var displayContext = CreateDisplayContext("gb", "nsw");
        var location = new ShippingLocation("au", "Australia", null, null);
        var productId = Guid.NewGuid();
        UpsellContext? capturedContext = null;

        _upsellContextBuilderMock
            .Setup(x => x.BuildLineItemAsync(productId, 1, 0m, It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateContextLineItem(productId));
        _storefrontContextServiceMock
            .Setup(x => x.GetDisplayContextAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(displayContext);
        _storefrontContextServiceMock
            .Setup(x => x.GetShippingLocationAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(location);
        _upsellEngineMock
            .Setup(x => x.GetSuggestionsForLocationAsync(
                It.IsAny<UpsellContext>(),
                It.IsAny<UpsellDisplayLocation>(),
                It.IsAny<CancellationToken>()))
            .Callback<UpsellContext, UpsellDisplayLocation, CancellationToken>((context, _, _) => capturedContext = context)
            .ReturnsAsync([]);

        await _controller.GetProductSuggestions(
            productId,
            null,
            null,
            CancellationToken.None);

        capturedContext.ShouldNotBeNull();
        capturedContext!.CountryCode.ShouldBe("AU");
        capturedContext.RegionCode.ShouldBe("NSW");
        capturedContext.DisplayContext.ShouldNotBeNull();
        capturedContext.DisplayContext!.TaxCountryCode.ShouldBe("AU");
        capturedContext.DisplayContext.TaxRegionCode.ShouldBe("NSW");
    }

    [Fact]
    public async Task GetSuggestions_WithSuggestions_StoresDistinctImpressionProductIds()
    {
        var basket = CreateBasket("gb", "lnd");
        var displayContext = CreateDisplayContext("gb", "lnd");
        var firstProductId = Guid.NewGuid();
        var secondProductId = Guid.NewGuid();
        AddUpsellImpressionsParameters? capturedImpressions = null;

        _checkoutServiceMock
            .Setup(x => x.GetBasket(It.IsAny<GetBasketParameters>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(basket);
        _upsellContextBuilderMock
            .Setup(x => x.BuildLineItemsAsync(It.IsAny<IEnumerable<LineItem>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([CreateContextLineItem()]);
        _storefrontContextServiceMock
            .Setup(x => x.GetDisplayContextAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(displayContext);
        _upsellEngineMock
            .Setup(x => x.GetSuggestionsForLocationAsync(
                It.IsAny<UpsellContext>(),
                UpsellDisplayLocation.Checkout,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync([
                new UpsellSuggestion
                {
                    UpsellRuleId = Guid.NewGuid(),
                    Heading = "Protect your order",
                    Products =
                    [
                        new UpsellProduct
                        {
                            ProductId = firstProductId,
                            ProductRootId = firstProductId,
                            Name = "Coverage A"
                        },
                        new UpsellProduct
                        {
                            ProductId = firstProductId,
                            ProductRootId = firstProductId,
                            Name = "Coverage A Duplicate"
                        },
                        new UpsellProduct
                        {
                            ProductId = secondProductId,
                            ProductRootId = secondProductId,
                            Name = "Coverage B"
                        },
                    ],
                }
            ]);
        _checkoutSessionServiceMock
            .Setup(x => x.AddUpsellImpressionsAsync(
                It.IsAny<AddUpsellImpressionsParameters>(),
                It.IsAny<CancellationToken>()))
            .Callback<AddUpsellImpressionsParameters, CancellationToken>((parameters, _) => capturedImpressions = parameters)
            .Returns(Task.CompletedTask);

        var result = await _controller.GetSuggestions(
            UpsellDisplayLocation.Checkout,
            null,
            null,
            CancellationToken.None);

        result.ShouldBeOfType<OkObjectResult>();
        capturedImpressions.ShouldNotBeNull();
        capturedImpressions!.BasketId.ShouldBe(basket.Id);
        capturedImpressions.Impressions.Count.ShouldBe(1);
        capturedImpressions.Impressions[0].DisplayLocation.ShouldBe(UpsellDisplayLocation.Checkout);
        capturedImpressions.Impressions[0].ProductIds.Count.ShouldBe(2);
        capturedImpressions.Impressions[0].ProductIds.ShouldContain(firstProductId);
        capturedImpressions.Impressions[0].ProductIds.ShouldContain(secondProductId);
    }

    private static Basket CreateBasket(string shippingCountryCode, string? shippingRegionCode)
    {
        var basket = new BasketFactory().Create(customerId: null, currencyCode: "GBP", currencySymbol: "GBP");
        basket.Id = Guid.NewGuid();
        basket.LineItems =
        [
            LineItemFactory.CreateVirtualForPreview(
                productId: Guid.NewGuid(),
                name: "Trigger Product",
                sku: "TRIGGER-1",
                quantity: 1,
                unitPrice: 10m)
        ];
        basket.ShippingAddress = new Address
        {
            CountryCode = shippingCountryCode,
            CountyState = new CountyState
            {
                RegionCode = shippingRegionCode
            }
        };

        return basket;
    }

    private static UpsellContextLineItem CreateContextLineItem(Guid? productId = null)
    {
        var id = productId ?? Guid.NewGuid();
        return new UpsellContextLineItem
        {
            LineItemId = Guid.NewGuid(),
            ProductId = id,
            ProductRootId = Guid.NewGuid(),
            Sku = "CONTEXT-1",
            Quantity = 1,
            UnitPrice = 10m
        };
    }

    private static StorefrontDisplayContext CreateDisplayContext(string taxCountryCode, string? taxRegionCode)
    {
        return new StorefrontDisplayContext(
            CurrencyCode: "EUR",
            CurrencySymbol: "EUR",
            DecimalPlaces: 2,
            ExchangeRate: 1.2345m,
            StoreCurrencyCode: "GBP",
            DisplayPricesIncTax: true,
            TaxCountryCode: taxCountryCode,
            TaxRegionCode: taxRegionCode,
            IsShippingTaxable: true,
            ShippingTaxRate: 20m);
    }
}
