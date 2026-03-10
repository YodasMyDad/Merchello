using Merchello.Core;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.ProductFeeds.Dtos;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Storefront.Dtos;
using Merchello.Core.Storefront.Services.Interfaces;
using Merchello.Core.Warehouses.Services.Interfaces;
using Merchello.Controllers;
using Merchello.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Controllers;

public class StorefrontApiControllerGoogleDiscountTests
{
    private readonly Mock<ICheckoutService> _checkoutService = new();
    private readonly Mock<ICheckoutDiscountService> _checkoutDiscountService = new();
    private readonly Mock<IStorefrontContextService> _storefrontContext = new();
    private readonly Mock<IProductService> _productService = new();
    private readonly Mock<ILocationsService> _locationsService = new();
    private readonly Mock<ICurrencyService> _currencyService = new();
    private readonly Mock<IStorefrontDtoMapper> _storefrontDtoMapper = new();

    private readonly MerchelloSettings _settings = new() { StoreCurrencyCode = "GBP" };

    [Fact]
    public async Task AddToBasket_OfferIdMatchesProduct_AppliesDiscount()
    {
        var productId = Guid.NewGuid();

        var basket = new Basket { Id = Guid.NewGuid() };
        var lineItem = new LineItem
        {
            Sku = "OFFER-SKU-001",
            ProductId = productId,
            LineItemType = LineItemType.Product
        };

        SetupAddProduct(basket, lineItem);
        SetupMapper();

        _checkoutDiscountService
            .Setup(x => x.ApplyGoogleAutoDiscountAsync(It.IsAny<ApplyGoogleAutoDiscountParameters>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CrudResult<Basket> { ResultObject = basket });

        var controller = CreateController();
        SetHttpContextWithDiscount(controller, new GoogleAutoDiscountActiveDto
        {
            OfferId = productId.ToString(),
            DiscountPercentage = 10,
            DiscountCode = "GTEST",
            CheckoutExpiryUtc = DateTime.UtcNow.AddHours(1)
        });

        await controller.AddToBasket(new AddToBasketDto { ProductId = productId, Quantity = 1 }, CancellationToken.None);

        _checkoutDiscountService.Verify(
            x => x.ApplyGoogleAutoDiscountAsync(It.IsAny<ApplyGoogleAutoDiscountParameters>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task AddToBasket_OfferIdDoesNotMatchProduct_DoesNotApplyDiscount()
    {
        var productId = Guid.NewGuid();
        var differentOfferId = Guid.NewGuid();

        var basket = new Basket { Id = Guid.NewGuid() };
        var lineItem = new LineItem
        {
            Sku = "OFFER-SKU-001",
            ProductId = productId,
            LineItemType = LineItemType.Product
        };

        SetupAddProduct(basket, lineItem);
        SetupMapper();

        var controller = CreateController();
        SetHttpContextWithDiscount(controller, new GoogleAutoDiscountActiveDto
        {
            OfferId = differentOfferId.ToString(),
            DiscountPercentage = 10,
            DiscountCode = "GTEST",
            CheckoutExpiryUtc = DateTime.UtcNow.AddHours(1)
        });

        await controller.AddToBasket(new AddToBasketDto { ProductId = productId, Quantity = 1 }, CancellationToken.None);

        _checkoutDiscountService.Verify(
            x => x.ApplyGoogleAutoDiscountAsync(It.IsAny<ApplyGoogleAutoDiscountParameters>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task AddToBasket_ExpiredDiscount_DoesNotApplyDiscount()
    {
        var productId = Guid.NewGuid();

        var basket = new Basket { Id = Guid.NewGuid() };
        var lineItem = new LineItem
        {
            Sku = "OFFER-SKU-001",
            ProductId = productId,
            LineItemType = LineItemType.Product
        };

        SetupAddProduct(basket, lineItem);
        SetupMapper();

        var controller = CreateController();
        SetHttpContextWithDiscount(controller, new GoogleAutoDiscountActiveDto
        {
            OfferId = productId.ToString(),
            DiscountPercentage = 10,
            DiscountCode = "GTEST",
            CheckoutExpiryUtc = DateTime.UtcNow.AddMinutes(-5)
        });

        await controller.AddToBasket(new AddToBasketDto { ProductId = productId, Quantity = 1 }, CancellationToken.None);

        _checkoutDiscountService.Verify(
            x => x.ApplyGoogleAutoDiscountAsync(It.IsAny<ApplyGoogleAutoDiscountParameters>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task AddToBasket_NoDiscountInHttpContext_DoesNotApplyDiscount()
    {
        var productId = Guid.NewGuid();

        var basket = new Basket { Id = Guid.NewGuid() };
        var lineItem = new LineItem
        {
            Sku = "OFFER-SKU-001",
            ProductId = productId,
            LineItemType = LineItemType.Product
        };

        SetupAddProduct(basket, lineItem);
        SetupMapper();

        var controller = CreateController();
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };

        await controller.AddToBasket(new AddToBasketDto { ProductId = productId, Quantity = 1 }, CancellationToken.None);

        _checkoutDiscountService.Verify(
            x => x.ApplyGoogleAutoDiscountAsync(It.IsAny<ApplyGoogleAutoDiscountParameters>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    private void SetupAddProduct(Basket basket, LineItem lineItem)
    {
        _checkoutService
            .Setup(x => x.AddProductWithAddonsAsync(It.IsAny<AddProductWithAddonsParameters>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(AddProductWithAddonsResult.Successful(basket, lineItem, []));
    }

    private void SetupMapper()
    {
        _storefrontDtoMapper
            .Setup(x => x.MapBasketOperationResult(It.IsAny<bool>(), It.IsAny<string>(), It.IsAny<Basket?>(), It.IsAny<string>()))
            .Returns(new BasketOperationResultDto());
    }

    private StorefrontApiController CreateController()
    {
        return new StorefrontApiController(
            _checkoutService.Object,
            _checkoutDiscountService.Object,
            _storefrontContext.Object,
            _productService.Object,
            _locationsService.Object,
            _currencyService.Object,
            _storefrontDtoMapper.Object,
            Options.Create(_settings));
    }

    private static void SetHttpContextWithDiscount(ControllerBase controller, GoogleAutoDiscountActiveDto discount)
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Items["MerchelloGoogleAutoDiscount"] = discount;
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };
    }
}
