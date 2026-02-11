using System.Text.Json;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.ExchangeRates.Services.Interfaces;
using Merchello.Core.Locality.Factories;
using Merchello.Core.Locality.Models;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Payments.Dtos;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers;
using Merchello.Core.Payments.Providers.Interfaces;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shipping.Extensions;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Shipping.Services.Parameters;
using Merchello.Core.Storefront.Services.Interfaces;
using Merchello.Core.Upsells.Services.Interfaces;
using Merchello.Services;
using Merchello.Tests.TestInfrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Shouldly;
using Umbraco.Cms.Core.Media;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Services;
using Xunit;

namespace Merchello.Tests.Checkout;

[Collection("Integration Tests")]
public class CheckoutPaymentsOrchestrationGhostOrderTests : IClassFixture<ServiceTestFixture>
{
    private static readonly JsonSerializerOptions SessionJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly ServiceTestFixture _fixture;
    private readonly ICheckoutService _checkoutService;
    private readonly ICheckoutSessionService _checkoutSessionService;
    private readonly IShippingService _shippingService;
    private readonly IInvoiceService _invoiceService;
    private readonly IPaymentService _paymentService;
    private readonly ISavedPaymentMethodService _savedPaymentMethodService;
    private readonly ICheckoutMemberService _checkoutMemberService;
    private readonly ICustomerService _customerService;
    private readonly IStorefrontContextService _storefrontContextService;
    private readonly ICurrencyService _currencyService;
    private readonly IExchangeRateCache _exchangeRateCache;
    private readonly IMerchelloNotificationPublisher _notificationPublisher;
    private readonly IPostPurchaseUpsellService _postPurchaseUpsellService;
    private readonly IMediaService _mediaService;
    private readonly AddressFactory _addressFactory;
    private readonly IOptions<MerchelloSettings> _settings;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<CheckoutPaymentsOrchestrationService> _logger;

    public CheckoutPaymentsOrchestrationGhostOrderTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();

        _checkoutService = fixture.GetService<ICheckoutService>();
        _checkoutSessionService = fixture.GetService<ICheckoutSessionService>();
        _shippingService = fixture.GetService<IShippingService>();
        _invoiceService = fixture.GetService<IInvoiceService>();
        _paymentService = fixture.GetService<IPaymentService>();
        _savedPaymentMethodService = fixture.GetService<ISavedPaymentMethodService>();
        _checkoutMemberService = fixture.GetService<ICheckoutMemberService>();
        _customerService = fixture.GetService<ICustomerService>();
        _storefrontContextService = fixture.GetService<IStorefrontContextService>();
        _currencyService = fixture.GetService<ICurrencyService>();
        _exchangeRateCache = fixture.GetService<IExchangeRateCache>();
        _notificationPublisher = fixture.GetService<IMerchelloNotificationPublisher>();
        _postPurchaseUpsellService = fixture.GetService<IPostPurchaseUpsellService>();
        _mediaService = fixture.GetService<IMediaService>();
        _addressFactory = fixture.GetService<AddressFactory>();
        _settings = fixture.GetService<IOptions<MerchelloSettings>>();
        _httpContextAccessor = fixture.GetService<IHttpContextAccessor>();
        _logger = fixture.GetService<ILogger<CheckoutPaymentsOrchestrationService>>();
    }

    [Fact]
    public async Task InitiatePaymentAsync_SecondAttempt_ReusesExistingUnpaidInvoice()
    {
        ConfigureManualProviderForPaymentSession();
        var service = CreateService();

        var (basket, session) = await CreateCheckoutReadyBasketAsync();
        await PersistBasketAndSessionAsync(basket, session);

        var request = new InitiatePaymentDto
        {
            ProviderAlias = "manual",
            MethodAlias = "manual",
            ReturnUrl = "https://example.test/checkout/return",
            CancelUrl = "https://example.test/checkout/cancel"
        };

        var firstResult = await service.InitiatePaymentAsync(request);
        firstResult.StatusCode.ShouldBe(StatusCodes.Status200OK);
        var firstPayload = firstResult.Payload.ShouldBeOfType<PaymentSessionResultDto>();
        firstPayload.Success.ShouldBeTrue();
        firstPayload.InvoiceId.ShouldNotBeNull();

        var secondResult = await service.InitiatePaymentAsync(request);
        secondResult.StatusCode.ShouldBe(StatusCodes.Status200OK);
        var secondPayload = secondResult.Payload.ShouldBeOfType<PaymentSessionResultDto>();
        secondPayload.Success.ShouldBeTrue();
        secondPayload.InvoiceId.ShouldNotBeNull();
        secondPayload.InvoiceId.ShouldBe(firstPayload.InvoiceId);

        _fixture.DbContext.ChangeTracker.Clear();
        var invoiceCount = _fixture.DbContext.Invoices.Count(i =>
            i.BasketId == basket.Id &&
            !i.IsDeleted &&
            !i.IsCancelled);

        invoiceCount.ShouldBe(1);
    }

    private CheckoutPaymentsOrchestrationService CreateService()
    {
        var mediaUrlGenerators = new MediaUrlGeneratorCollection(() => []);
        var memberManagerMock = new Mock<IMemberManager>();

        return new CheckoutPaymentsOrchestrationService(
            _fixture.PaymentProviderManagerMock.Object,
            _paymentService,
            _savedPaymentMethodService,
            _invoiceService,
            _checkoutService,
            _checkoutSessionService,
            _checkoutMemberService,
            _customerService,
            _storefrontContextService,
            _currencyService,
            _exchangeRateCache,
            _notificationPublisher,
            _postPurchaseUpsellService,
            _mediaService,
            mediaUrlGenerators,
            memberManagerMock.Object,
            _addressFactory,
            _settings,
            _httpContextAccessor,
            _logger);
    }

    private void ConfigureManualProviderForPaymentSession()
    {
        var provider = new Mock<IPaymentProvider>();
        provider.SetupGet(x => x.Metadata).Returns(new PaymentProviderMetadata
        {
            Alias = "manual",
            DisplayName = "Manual Payment"
        });
        provider.Setup(x => x.GetAvailablePaymentMethods())
            .Returns([
                new PaymentMethodDefinition
                {
                    Alias = "manual",
                    DisplayName = "Manual Payment",
                    IntegrationType = PaymentIntegrationType.HostedFields
                }
            ]);
        provider.Setup(x => x.CreatePaymentSessionAsync(It.IsAny<PaymentRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(PaymentSessionResult.HostedFields(
                providerAlias: "manual",
                methodAlias: "manual",
                adapterUrl: "/adapter/manual.js",
                jsSdkUrl: "https://example.test/sdk.js",
                sessionId: "session-1"));

        var setting = new PaymentProviderSetting
        {
            ProviderAlias = "manual",
            DisplayName = "Manual Payment",
            IsEnabled = true
        };
        var registeredProvider = new RegisteredPaymentProvider(provider.Object, setting);

        _fixture.PaymentProviderManagerMock
            .Setup(x => x.GetProviderAsync("manual", It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(registeredProvider);
    }

    private async Task<(Basket Basket, CheckoutSession Session)> CreateCheckoutReadyBasketAsync()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse("Ghost Order Warehouse", "GB");
        var shippingOption = dataBuilder.CreateShippingOption("Standard Delivery", warehouse, fixedCost: 5.00m);
        shippingOption.SetShippingCosts(
        [
            new Merchello.Core.Shipping.Models.ShippingCost
            {
                ShippingOptionId = shippingOption.Id,
                CountryCode = "GB",
                Cost = 5.00m
            }
        ]);
        dataBuilder.AddServiceRegion(warehouse, "GB");

        var taxGroup = dataBuilder.CreateTaxGroup("Standard VAT", 20m);
        var productRoot = dataBuilder.CreateProductRoot("Ghost Order Product", taxGroup);
        var product = dataBuilder.CreateProduct("Ghost Order Variant", productRoot, price: 49.99m);
        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var basket = _checkoutService.CreateBasket("GBP");
        var lineItem = _checkoutService.CreateLineItem(product, 1);
        await _checkoutService.AddToBasketAsync(basket, lineItem, "GB");
        await _checkoutService.CalculateBasketAsync(new CalculateBasketParameters
        {
            Basket = basket,
            CountryCode = "GB"
        });

        var addressBuilder = _fixture.CreateDataBuilder();
        var billingAddress = addressBuilder.CreateTestAddress(
            email: "checkout@example.com",
            countryCode: "GB",
            firstName: "Checkout",
            lastName: "Tester");

        var shippingAddress = addressBuilder.CreateTestAddress(
            email: "checkout@example.com",
            countryCode: "GB",
            firstName: "Checkout",
            lastName: "Tester");

        basket.BillingAddress = billingAddress;
        basket.ShippingAddress = shippingAddress;

        var shippingResult = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = shippingAddress
            });

        var group = shippingResult.WarehouseGroups.First();
        var selectedOption = group.AvailableShippingOptions.First();

        var session = new CheckoutSession
        {
            BasketId = basket.Id,
            BillingAddress = billingAddress,
            ShippingAddress = shippingAddress,
            ShippingSameAsBilling = false,
            CurrentStep = CheckoutStep.Payment,
            SelectedShippingOptions = new Dictionary<Guid, string>
            {
                [group.GroupId] = SelectionKeyExtensions.ForShippingOption(selectedOption.ShippingOptionId)
            }
        };

        return (basket, session);
    }

    private async Task PersistBasketAndSessionAsync(Basket basket, CheckoutSession session)
    {
        _fixture.DbContext.Baskets.Add(basket);
        await _fixture.DbContext.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        await _checkoutService.SaveBasketAsync(new SaveBasketParameters { Basket = basket });

        await _checkoutSessionService.SaveAddressesAsync(new SaveSessionAddressesParameters
        {
            BasketId = basket.Id,
            Billing = session.BillingAddress,
            Shipping = session.ShippingAddress,
            SameAsBilling = session.ShippingSameAsBilling
        });

        await _checkoutSessionService.SaveShippingSelectionsAsync(new SaveSessionShippingSelectionsParameters
        {
            BasketId = basket.Id,
            Selections = session.SelectedShippingOptions
        });

        await _checkoutSessionService.SetCurrentStepAsync(basket.Id, CheckoutStep.Payment);

        var basketJson = JsonSerializer.Serialize(basket, SessionJsonOptions);
        _fixture.MockHttpContext.Session.SetString("Basket", basketJson);
    }
}
