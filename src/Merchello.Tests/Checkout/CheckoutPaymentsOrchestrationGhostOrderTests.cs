using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.ExchangeRates.Services.Interfaces;
using Merchello.Core.Locality.Dtos;
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
using Microsoft.EntityFrameworkCore;
using Umbraco.Cms.Core.Media;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Services;
using Xunit;

namespace Merchello.Tests.Checkout;

[Collection("Integration Tests")]
public class CheckoutPaymentsOrchestrationGhostOrderTests : IClassFixture<ServiceTestFixture>
{
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

    [Fact]
    public async Task InitiatePaymentAsync_WhenCheckoutDetailsChange_SupersedesPreviousUnpaidInvoice()
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
        var firstInvoiceId = firstPayload.InvoiceId.Value;

        // Simulate staff editing checkout details after first payment-init.
        var updatedBilling = ToAddressDto(session.BillingAddress);
        updatedBilling.AddressTwo = "Suite 2";
        var updatedShipping = ToAddressDto(session.ShippingAddress);
        updatedShipping.AddressTwo = "Suite 2";

        var saveAddressesResult = await _checkoutService.SaveAddressesAsync(new SaveAddressesParameters
        {
            Basket = basket,
            Email = session.BillingAddress.Email,
            BillingAddress = updatedBilling,
            ShippingAddress = updatedShipping,
            ShippingSameAsBilling = false
        });

        saveAddressesResult.Success.ShouldBeTrue();

        // Ensure timestamp ordering is deterministic for stale-invoice detection.
        _fixture.DbContext.ChangeTracker.Clear();
        var firstInvoice = await _fixture.DbContext.Invoices
            .AsNoTracking()
            .SingleAsync(i => i.Id == firstInvoiceId);
        var updatedBasket = await _fixture.DbContext.Baskets
            .SingleAsync(b => b.Id == basket.Id);

        if (updatedBasket.DateUpdated <= firstInvoice.DateCreated)
        {
            updatedBasket.DateUpdated = firstInvoice.DateCreated.AddSeconds(1);
            await _checkoutService.SaveBasketAsync(new SaveBasketParameters { Basket = updatedBasket });
        }

        var secondResult = await service.InitiatePaymentAsync(request);
        secondResult.StatusCode.ShouldBe(StatusCodes.Status200OK);
        var secondPayload = secondResult.Payload.ShouldBeOfType<PaymentSessionResultDto>();
        secondPayload.Success.ShouldBeTrue();
        secondPayload.InvoiceId.ShouldNotBeNull();
        secondPayload.InvoiceId.ShouldNotBe(firstInvoiceId);

        var secondInvoiceId = secondPayload.InvoiceId.Value;

        _fixture.DbContext.ChangeTracker.Clear();
        var basketInvoices = await _fixture.DbContext.Invoices
            .Where(i => i.BasketId == basket.Id && !i.IsDeleted)
            .ToListAsync();

        basketInvoices.Count.ShouldBe(2);
        basketInvoices.Count(i => !i.IsCancelled).ShouldBe(1);
        basketInvoices.Single(i => i.Id == firstInvoiceId).IsCancelled.ShouldBeTrue();
        basketInvoices.Single(i => i.Id == secondInvoiceId).IsCancelled.ShouldBeFalse();

        var cancelledOrders = await _fixture.DbContext.Orders
            .Where(o => o.InvoiceId == firstInvoiceId)
            .ToListAsync();

        cancelledOrders.Count.ShouldBeGreaterThan(0);
        cancelledOrders.All(o => o.Status == OrderStatus.Cancelled).ShouldBeTrue();

        // Old invoice reservation should be released, leaving only the active invoice reservation.
        var activeOrder = await _fixture.DbContext.Orders
            .Include(o => o.LineItems)
            .SingleAsync(o => o.InvoiceId == secondInvoiceId);

        var productLineItem = activeOrder.LineItems!
            .First(li => li.ProductId.HasValue);

        var stock = await _fixture.DbContext.ProductWarehouses.SingleAsync(pw =>
            pw.ProductId == productLineItem.ProductId!.Value &&
            pw.WarehouseId == activeOrder.WarehouseId);

        stock.ReservedStock.ShouldBe(productLineItem.Quantity);
    }

    [Fact]
    public async Task InitiatePaymentAsync_WhenPreviousInvoiceHasPartiallyShippedOrder_DoesNotCancelPreviousInvoice()
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
        var firstInvoiceId = firstPayload.InvoiceId.Value;

        _fixture.DbContext.ChangeTracker.Clear();
        var firstOrder = await _fixture.DbContext.Orders
            .SingleAsync(o => o.InvoiceId == firstInvoiceId);
        firstOrder.Status = OrderStatus.PartiallyShipped;
        firstOrder.ShippedDate = DateTime.UtcNow;
        await _fixture.DbContext.SaveChangesAsync();

        var updatedBilling = ToAddressDto(session.BillingAddress);
        updatedBilling.AddressTwo = "Suite 2";
        var updatedShipping = ToAddressDto(session.ShippingAddress);
        updatedShipping.AddressTwo = "Suite 2";

        var saveAddressesResult = await _checkoutService.SaveAddressesAsync(new SaveAddressesParameters
        {
            Basket = basket,
            Email = session.BillingAddress.Email,
            BillingAddress = updatedBilling,
            ShippingAddress = updatedShipping,
            ShippingSameAsBilling = false
        });

        saveAddressesResult.Success.ShouldBeTrue();

        _fixture.DbContext.ChangeTracker.Clear();
        var firstInvoice = await _fixture.DbContext.Invoices
            .AsNoTracking()
            .SingleAsync(i => i.Id == firstInvoiceId);
        var updatedBasket = await _fixture.DbContext.Baskets
            .SingleAsync(b => b.Id == basket.Id);

        if (updatedBasket.DateUpdated <= firstInvoice.DateCreated)
        {
            updatedBasket.DateUpdated = firstInvoice.DateCreated.AddSeconds(1);
            await _checkoutService.SaveBasketAsync(new SaveBasketParameters { Basket = updatedBasket });
        }

        var secondResult = await service.InitiatePaymentAsync(request);
        secondResult.StatusCode.ShouldBe(StatusCodes.Status200OK);
        var secondPayload = secondResult.Payload.ShouldBeOfType<PaymentSessionResultDto>();
        secondPayload.Success.ShouldBeTrue();
        secondPayload.InvoiceId.ShouldNotBeNull();
        secondPayload.InvoiceId.ShouldNotBe(firstInvoiceId);

        _fixture.DbContext.ChangeTracker.Clear();
        var basketInvoices = await _fixture.DbContext.Invoices
            .Where(i => i.BasketId == basket.Id && !i.IsDeleted)
            .ToListAsync();

        basketInvoices.Count.ShouldBe(2);
        basketInvoices.Single(i => i.Id == firstInvoiceId).IsCancelled.ShouldBeFalse();
        basketInvoices.Single(i => i.Id == secondPayload.InvoiceId.Value).IsCancelled.ShouldBeFalse();

        var reloadedFirstOrder = await _fixture.DbContext.Orders
            .SingleAsync(o => o.Id == firstOrder.Id);
        reloadedFirstOrder.Status.ShouldBe(OrderStatus.PartiallyShipped);
    }

    [Fact]
    public async Task ProcessExpressCheckoutAsync_WhenProviderOmitsTransactionId_UsesDeterministicFallbackEverywhere()
    {
        const string providerAlias = "express-test";
        const string methodAlias = "express-wallet";
        const string paymentToken = "wallet-token-123";

        ConfigureExpressProviderWithoutTransactionId(providerAlias, methodAlias);
        var service = CreateService();

        var (basket, session) = await CreateCheckoutReadyBasketAsync();
        await PersistBasketAndSessionAsync(basket, session);

        var request = new ExpressCheckoutRequestDto
        {
            ProviderAlias = providerAlias,
            MethodAlias = methodAlias,
            PaymentToken = paymentToken,
            CustomerData = new ExpressCheckoutCustomerDataDto
            {
                Email = session.BillingAddress.Email!,
                FullName = session.BillingAddress.Name,
                Phone = session.BillingAddress.Phone,
                ShippingAddress = MapToExpressAddress(session.ShippingAddress),
                BillingAddress = MapToExpressAddress(session.BillingAddress)
            }
        };

        var result = await service.ProcessExpressCheckoutAsync(request);
        result.StatusCode.ShouldBe(StatusCodes.Status200OK);

        var payload = result.Payload.ShouldBeOfType<ExpressCheckoutResponseDto>();
        payload.Success.ShouldBeTrue();
        payload.InvoiceId.ShouldNotBeNull();

        var expectedTransactionId = BuildDeterministicTransactionId(
            "express_",
            $"{payload.InvoiceId}:{providerAlias}:{methodAlias}:{paymentToken}");

        payload.TransactionId.ShouldBe(expectedTransactionId);

        _fixture.DbContext.ChangeTracker.Clear();
        var payment = _fixture.DbContext.Payments.Single(p => p.InvoiceId == payload.InvoiceId.Value);
        payment.TransactionId.ShouldBe(expectedTransactionId);
    }

    [Fact]
    public async Task ProcessSavedPaymentAsync_RecordsPaymentAndReturnsRecordedTransactionId()
    {
        const string idempotencyKey = "saved-idempotency-123";

        var memberKey = Guid.NewGuid();
        var memberManagerMock = new Mock<IMemberManager>();
        var member = MemberIdentityUser.CreateNew(
            "checkout.member@example.com",
            "checkout.member@example.com",
            "Checkout Member",
            true,
            "member",
            memberKey);

        memberManagerMock
            .Setup(x => x.GetCurrentMemberAsync())
            .ReturnsAsync(member);

        ConfigureStripeProviderForSavedPaymentCharge();
        var service = CreateService(memberManagerMock.Object);

        var dataBuilder = _fixture.CreateDataBuilder();
        var customer = dataBuilder.CreateCustomer("checkout@example.com", "Checkout", "Tester");
        customer.MemberKey = memberKey;
        var savedMethod = dataBuilder.CreateSavedPaymentMethod(
            customer,
            providerAlias: "stripe",
            expiryYear: DateTime.UtcNow.Year + 2,
            isDefault: true);
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var (basket, session) = await CreateCheckoutReadyBasketAsync();
        await PersistBasketAndSessionAsync(basket, session);

        var createInvoiceResult = await _invoiceService.CreateOrderFromBasketAsync(
            basket,
            session,
            source: null,
            cancellationToken: CancellationToken.None);

        createInvoiceResult.Success.ShouldBeTrue();
        var invoice = createInvoiceResult.ResultObject.ShouldNotBeNull();
        await _checkoutSessionService.SetInvoiceIdAsync(basket.Id, invoice.Id, CancellationToken.None);

        var result = await service.ProcessSavedPaymentAsync(
            new ProcessSavedPaymentMethodDto
            {
                InvoiceId = invoice.Id,
                SavedPaymentMethodId = savedMethod.Id,
                IdempotencyKey = idempotencyKey
            });

        result.StatusCode.ShouldBe(StatusCodes.Status200OK);

        var payload = result.Payload.ShouldBeOfType<ProcessPaymentResultDto>();
        payload.Success.ShouldBeTrue();
        payload.TransactionId.ShouldNotBeNull();

        var expectedTransactionId = BuildDeterministicTransactionId(
            "saved_",
            $"{invoice.Id}:{savedMethod.Id}:{idempotencyKey}");

        payload.TransactionId.ShouldBe(expectedTransactionId);

        _fixture.DbContext.ChangeTracker.Clear();
        var payments = _fixture.DbContext.Payments
            .Where(p => p.InvoiceId == invoice.Id)
            .ToList();
        payments.Count.ShouldBe(1);
        payments[0].TransactionId.ShouldBe(expectedTransactionId);
        payments[0].IdempotencyKey.ShouldBe(idempotencyKey);
    }

    private CheckoutPaymentsOrchestrationService CreateService(IMemberManager? memberManager = null)
    {
        var mediaUrlGenerators = new MediaUrlGeneratorCollection(() => []);
        memberManager ??= new Mock<IMemberManager>().Object;

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
            memberManager,
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

    private void ConfigureExpressProviderWithoutTransactionId(
        string providerAlias = "express-test",
        string methodAlias = "express-wallet")
    {
        var provider = new Mock<IPaymentProvider>();
        provider.SetupGet(x => x.Metadata).Returns(new PaymentProviderMetadata
        {
            Alias = providerAlias,
            DisplayName = "Express Test Provider"
        });
        provider.Setup(x => x.GetAvailablePaymentMethods())
            .Returns([
                new PaymentMethodDefinition
                {
                    Alias = methodAlias,
                    DisplayName = "Express Wallet",
                    IntegrationType = PaymentIntegrationType.HostedFields,
                    IsExpressCheckout = true
                }
            ]);
        provider.Setup(x => x.ProcessExpressCheckoutAsync(
                It.IsAny<ExpressCheckoutRequest>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((ExpressCheckoutRequest request, CancellationToken _) => new ExpressCheckoutResult
            {
                Success = true,
                Status = PaymentResultStatus.Completed,
                TransactionId = null,
                Amount = request.Amount
            });

        var setting = new PaymentProviderSetting
        {
            ProviderAlias = providerAlias,
            DisplayName = "Express Test Provider",
            IsEnabled = true
        };

        var registeredProvider = new RegisteredPaymentProvider(provider.Object, setting);
        _fixture.PaymentProviderManagerMock
            .Setup(x => x.GetProviderAsync(providerAlias, It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(registeredProvider);
    }

    private void ConfigureStripeProviderForSavedPaymentCharge(string? transactionId = null)
    {
        var provider = new Mock<IPaymentProvider>();
        provider.SetupGet(x => x.Metadata).Returns(new PaymentProviderMetadata
        {
            Alias = "stripe",
            DisplayName = "Stripe",
            SupportsVaultedPayments = true
        });
        provider.Setup(x => x.ChargeVaultedMethodAsync(
                It.IsAny<ChargeVaultedMethodRequest>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((ChargeVaultedMethodRequest request, CancellationToken _) => new PaymentResult
            {
                Success = true,
                Status = PaymentResultStatus.Completed,
                TransactionId = transactionId,
                Amount = request.Amount
            });

        var setting = new PaymentProviderSetting
        {
            ProviderAlias = "stripe",
            DisplayName = "Stripe",
            IsEnabled = true,
            IsVaultingEnabled = true
        };
        var registeredProvider = new RegisteredPaymentProvider(provider.Object, setting);

        _fixture.PaymentProviderManagerMock
            .Setup(x => x.GetProviderAsync("stripe", It.IsAny<bool>(), It.IsAny<CancellationToken>()))
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

        _fixture.MockHttpContext.HttpContext!.Items["merchello:Basket"] = basket;
    }

    private static ExpressCheckoutAddressDto MapToExpressAddress(Address address) => new()
    {
        AddressOne = address.AddressOne,
        AddressTwo = address.AddressTwo,
        TownCity = address.TownCity,
        CountyState = address.CountyState.RegionCode,
        PostalCode = address.PostalCode,
        CountryCode = address.CountryCode
    };

    private static AddressDto ToAddressDto(Address address) => new()
    {
        Name = address.Name,
        Company = address.Company,
        AddressOne = address.AddressOne,
        AddressTwo = address.AddressTwo,
        TownCity = address.TownCity,
        CountyState = address.CountyState?.RegionCode,
        RegionCode = address.CountyState?.RegionCode,
        PostalCode = address.PostalCode,
        Country = address.Country,
        CountryCode = address.CountryCode,
        Email = address.Email,
        Phone = address.Phone
    };

    private static string BuildDeterministicTransactionId(string prefix, string seed)
    {
        var hashBytes = System.Security.Cryptography.SHA256.HashData(
            System.Text.Encoding.UTF8.GetBytes(seed));
        return prefix + Convert.ToHexString(hashBytes)[..16].ToLowerInvariant();
    }
}
