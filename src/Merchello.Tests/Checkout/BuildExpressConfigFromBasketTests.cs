using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.ExchangeRates.Services.Interfaces;
using Merchello.Core.Locality.Factories;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Payments.Dtos;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers;
using Merchello.Core.Payments.Providers.Interfaces;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Storefront.Services.Interfaces;
using Merchello.Core.Upsells.Services.Interfaces;
using Merchello.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Shouldly;
using Merchello.Core.Storefront.Models;
using Umbraco.Cms.Core.Media;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Services;
using Xunit;

namespace Merchello.Tests.Checkout;

public class BuildExpressConfigFromBasketTests
{
    private readonly Mock<IPaymentProviderManager> _providerManager = new();
    private readonly Mock<IStorefrontContextService> _storefrontContext = new();
    private readonly Mock<ICurrencyService> _currencyService = new();
    private readonly Mock<IExchangeRateCache> _exchangeRateCache = new();
    private readonly IOptions<MerchelloSettings> _settings;
    private readonly CheckoutPaymentsOrchestrationService _service;

    public BuildExpressConfigFromBasketTests()
    {
        _settings = Options.Create(new MerchelloSettings { StoreCurrencyCode = "GBP" });

        _storefrontContext
            .Setup(x => x.GetCurrencyContextAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new StorefrontCurrencyContext("GBP", "£", 2, 1m, "GBP"));

        _service = new CheckoutPaymentsOrchestrationService(
            _providerManager.Object,
            new Mock<IPaymentService>().Object,
            new Mock<ISavedPaymentMethodService>().Object,
            new Mock<IInvoiceService>().Object,
            new Mock<ICheckoutService>().Object,
            new Mock<ICheckoutSessionService>().Object,
            new Mock<ICheckoutMemberService>().Object,
            new Mock<ICustomerService>().Object,
            _storefrontContext.Object,
            _currencyService.Object,
            _exchangeRateCache.Object,
            new Mock<IMerchelloNotificationPublisher>().Object,
            new Mock<IPostPurchaseUpsellService>().Object,
            new Mock<IMediaService>().Object,
            new MediaUrlGeneratorCollection(() => []),
            new Mock<IMemberManager>().Object,
            new AddressFactory(),
            _settings,
            new Mock<IHttpContextAccessor>().Object,
            new Mock<ILogger<CheckoutPaymentsOrchestrationService>>().Object);
    }

    [Fact]
    public async Task BuildExpressConfigFromBasketAsync_NoExpressMethods_ReturnsEmptyConfig()
    {
        // Arrange
        _providerManager
            .Setup(x => x.GetExpressCheckoutMethodsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<PaymentMethodDto>());

        var basket = CreateBasket(total: 100m, subTotal: 80m, shipping: 10m, tax: 10m);

        // Act
        var result = await _service.BuildExpressConfigFromBasketAsync(basket);

        // Assert
        result.Currency.ShouldBe("GBP");
        result.Methods.ShouldBeEmpty();
    }

    [Fact]
    public async Task BuildExpressConfigFromBasketAsync_WithMethods_UsesBasketTotals()
    {
        // Arrange
        _providerManager
            .Setup(x => x.GetExpressCheckoutMethodsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new PaymentMethodDto
                {
                    ProviderAlias = "stripe",
                    MethodAlias = "applepay",
                    DisplayName = "Apple Pay",
                    MethodType = "ApplePay"
                }
            });

        var mockProvider = new Mock<IPaymentProvider>();
        mockProvider
            .Setup(p => p.GetExpressCheckoutClientConfigAsync(
                "applepay", It.IsAny<decimal>(), "GBP", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ExpressCheckoutClientConfig
            {
                ProviderAlias = "stripe",
                MethodAlias = "applepay",
                IsAvailable = true,
                MethodType = "ApplePay",
                SdkUrl = "https://js.stripe.com/v3/"
            });

        _providerManager
            .Setup(x => x.GetProviderAsync("stripe", true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RegisteredPaymentProvider(mockProvider.Object, null));

        var basket = CreateBasket(total: 99.99m, subTotal: 79.99m, shipping: 10m, tax: 10m);

        // Act
        var result = await _service.BuildExpressConfigFromBasketAsync(basket);

        // Assert
        result.Amount.ShouldBe(99.99m);
        result.SubTotal.ShouldBe(79.99m);
        result.Shipping.ShouldBe(10m);
        result.Tax.ShouldBe(10m);
        result.Currency.ShouldBe("GBP");
        result.DecimalPlaces.ShouldBe(2);
        result.Methods.Count.ShouldBe(1);
        result.Methods[0].ProviderAlias.ShouldBe("stripe");
        result.Methods[0].MethodAlias.ShouldBe("applepay");
        result.Methods[0].SdkUrl.ShouldBe("https://js.stripe.com/v3/");
    }

    [Fact]
    public async Task BuildExpressConfigFromBasketAsync_SkipsUnavailableMethods()
    {
        // Arrange
        _providerManager
            .Setup(x => x.GetExpressCheckoutMethodsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new PaymentMethodDto
                {
                    ProviderAlias = "stripe",
                    MethodAlias = "applepay",
                    DisplayName = "Apple Pay",
                    MethodType = "ApplePay"
                }
            });

        var mockProvider = new Mock<IPaymentProvider>();
        mockProvider
            .Setup(p => p.GetExpressCheckoutClientConfigAsync(
                "applepay", It.IsAny<decimal>(), "GBP", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ExpressCheckoutClientConfig
            {
                ProviderAlias = "stripe",
                MethodAlias = "applepay",
                IsAvailable = false // Not available on this device
            });

        _providerManager
            .Setup(x => x.GetProviderAsync("stripe", true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RegisteredPaymentProvider(mockProvider.Object, null));

        var basket = CreateBasket(total: 100m, subTotal: 80m, shipping: 10m, tax: 10m);

        // Act
        var result = await _service.BuildExpressConfigFromBasketAsync(basket);

        // Assert
        result.Methods.ShouldBeEmpty();
    }

    [Fact]
    public async Task BuildExpressConfigFromBasketAsync_DoesNotCallShippingCalculation()
    {
        // Arrange - the key point: no ICheckoutService shipping methods should be called
        var checkoutServiceMock = new Mock<ICheckoutService>();

        var service = new CheckoutPaymentsOrchestrationService(
            _providerManager.Object,
            new Mock<IPaymentService>().Object,
            new Mock<ISavedPaymentMethodService>().Object,
            new Mock<IInvoiceService>().Object,
            checkoutServiceMock.Object,
            new Mock<ICheckoutSessionService>().Object,
            new Mock<ICheckoutMemberService>().Object,
            new Mock<ICustomerService>().Object,
            _storefrontContext.Object,
            _currencyService.Object,
            _exchangeRateCache.Object,
            new Mock<IMerchelloNotificationPublisher>().Object,
            new Mock<IPostPurchaseUpsellService>().Object,
            new Mock<IMediaService>().Object,
            new MediaUrlGeneratorCollection(() => []),
            new Mock<IMemberManager>().Object,
            new AddressFactory(),
            _settings,
            new Mock<IHttpContextAccessor>().Object,
            new Mock<ILogger<CheckoutPaymentsOrchestrationService>>().Object);

        _providerManager
            .Setup(x => x.GetExpressCheckoutMethodsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<PaymentMethodDto>());

        var basket = CreateBasket(total: 100m, subTotal: 80m, shipping: 10m, tax: 10m);

        // Act
        await service.BuildExpressConfigFromBasketAsync(basket);

        // Assert - these should NEVER be called (the whole point of this optimization)
        checkoutServiceMock.Verify(
            x => x.GetOrderGroupsAsync(It.IsAny<GetOrderGroupsParameters>(), It.IsAny<CancellationToken>()),
            Times.Never);
        checkoutServiceMock.Verify(
            x => x.CalculateBasketAsync(It.IsAny<CalculateBasketParameters>(), It.IsAny<CancellationToken>()),
            Times.Never);
        checkoutServiceMock.Verify(
            x => x.GetBasket(It.IsAny<GetBasketParameters>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    private static Basket CreateBasket(decimal total, decimal subTotal, decimal shipping, decimal tax)
    {
        return new Basket
        {
            Id = Guid.NewGuid(),
            Currency = "GBP",
            CurrencySymbol = "£",
            Total = total,
            SubTotal = subTotal,
            Shipping = shipping,
            Tax = tax,
            LineItems =
            [
                new LineItem
                {
                    Id = Guid.NewGuid(),
                    Name = "Test Product",
                    Sku = "TEST-001",
                    Amount = subTotal,
                    Quantity = 1,
                    LineItemType = LineItemType.Product,
                    ProductId = Guid.NewGuid()
                }
            ]
        };
    }
}
