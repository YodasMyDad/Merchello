using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Checkout.Handlers;
using Merchello.Core.Notifications.Payment;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Products.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Shipping.Extensions;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Shipping.Services.Parameters;
using Merchello.Core.Warehouses.Models;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Checkout;

[Collection("Integration Tests")]
public class AbandonedCheckoutConversionFlowTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IInvoiceService _invoiceService;
    private readonly IAbandonedCheckoutService _abandonedCheckoutService;
    private readonly ICheckoutService _checkoutService;
    private readonly IShippingService _shippingService;
    private readonly IPaymentService _paymentService;
    private readonly AbandonedCheckoutConversionHandler _conversionHandler;

    public AbandonedCheckoutConversionFlowTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _invoiceService = fixture.GetService<IInvoiceService>();
        _abandonedCheckoutService = fixture.GetService<IAbandonedCheckoutService>();
        _checkoutService = fixture.GetService<ICheckoutService>();
        _shippingService = fixture.GetService<IShippingService>();
        _paymentService = fixture.GetService<IPaymentService>();
        _conversionHandler = fixture.GetService<AbandonedCheckoutConversionHandler>();
    }

    [Fact]
    public async Task CreateOrderFromBasket_DoesNotConvertTrackedCheckoutBeforePayment()
    {
        var (basket, checkoutSession) = await CreateCheckoutScenarioAsync();
        await _abandonedCheckoutService.TrackCheckoutActivityAsync(basket, "john@example.com");

        var createResult = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);
        createResult.Success.ShouldBeTrue();

        var tracked = await _abandonedCheckoutService.GetByBasketIdAsync(basket.Id);
        tracked.ShouldNotBeNull();
        tracked.Status.ShouldBe(AbandonedCheckoutStatus.Active);
        tracked.RecoveredInvoiceId.ShouldBeNull();
        tracked.DateConverted.ShouldBeNull();
    }

    [Fact]
    public async Task RecordManualPayment_ConvertsTrackedCheckoutAfterSuccessfulPayment()
    {
        var (basket, checkoutSession) = await CreateCheckoutScenarioAsync();
        await _abandonedCheckoutService.TrackCheckoutActivityAsync(basket, "john@example.com");

        var createResult = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);
        createResult.Success.ShouldBeTrue();
        var invoice = createResult.ResultObject!;

        var paymentResult = await _paymentService.RecordManualPaymentAsync(
            new RecordManualPaymentParameters
            {
                InvoiceId = invoice.Id,
                Amount = invoice.Total,
                PaymentMethod = "Manual"
            });

        paymentResult.Success.ShouldBeTrue();

        var tracked = await _abandonedCheckoutService.GetByBasketIdAsync(basket.Id);
        tracked.ShouldNotBeNull();
        tracked.Status.ShouldBe(AbandonedCheckoutStatus.Converted);
        tracked.RecoveredInvoiceId.ShouldBe(invoice.Id);
        tracked.DateConverted.ShouldNotBeNull();
    }

    [Fact]
    public async Task PaymentCreatedNotification_WithFailedPayment_DoesNotConvertTrackedCheckout()
    {
        var (basket, checkoutSession) = await CreateCheckoutScenarioAsync();
        await _abandonedCheckoutService.TrackCheckoutActivityAsync(basket, "john@example.com");

        var createResult = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);
        createResult.Success.ShouldBeTrue();
        var invoice = createResult.ResultObject!;

        var failedPayment = new Payment
        {
            InvoiceId = invoice.Id,
            Amount = invoice.Total,
            CurrencyCode = invoice.CurrencyCode,
            PaymentType = PaymentType.Payment,
            PaymentSuccess = false
        };

        await _conversionHandler.HandleAsync(new PaymentCreatedNotification(failedPayment), CancellationToken.None);

        var tracked = await _abandonedCheckoutService.GetByBasketIdAsync(basket.Id);
        tracked.ShouldNotBeNull();
        tracked.Status.ShouldBe(AbandonedCheckoutStatus.Active);
        tracked.RecoveredInvoiceId.ShouldBeNull();
        tracked.DateConverted.ShouldBeNull();
    }

    [Fact]
    public async Task DetectAbandonedCheckouts_StillProcessesTrackedCheckoutAfterInvoiceCreationIfUnpaid()
    {
        var (basket, checkoutSession) = await CreateCheckoutScenarioAsync();
        await _abandonedCheckoutService.TrackCheckoutActivityAsync(basket, "john@example.com");

        var createResult = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);
        createResult.Success.ShouldBeTrue();

        _fixture.DbContext.ChangeTracker.Clear();
        var trackedInDb = _fixture.DbContext.AbandonedCheckouts.First(ac => ac.BasketId == basket.Id);
        trackedInDb.LastActivityUtc = DateTime.UtcNow.AddHours(-2);
        await _fixture.DbContext.SaveChangesAsync();

        await _abandonedCheckoutService.DetectAbandonedCheckoutsAsync(TimeSpan.FromHours(1));

        var tracked = await _abandonedCheckoutService.GetByBasketIdAsync(basket.Id);
        tracked.ShouldNotBeNull();
        tracked.Status.ShouldBe(AbandonedCheckoutStatus.Abandoned);
        tracked.DateAbandoned.ShouldNotBeNull();
    }

    private async Task<(Basket Basket, CheckoutSession Session)> CreateCheckoutScenarioAsync()
    {
        var (warehouse, _, product) = await SetupWarehouseAndProductAsync();
        var basket = await CreateBasketAsync(product);

        basket.BillingAddress = CreateAddress("john@example.com", "GB", "John", "Smith");
        basket.ShippingAddress = CreateAddress("john@example.com", "GB", "John", "Smith");

        _fixture.DbContext.Baskets.Add(basket);
        await _fixture.DbContext.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var shippingResult = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = basket.ShippingAddress
            });

        var group = shippingResult.WarehouseGroups.First();
        var selectedOption = group.AvailableShippingOptions.First();
        var session = new CheckoutSession
        {
            BasketId = basket.Id,
            BillingAddress = basket.BillingAddress,
            ShippingAddress = basket.ShippingAddress,
            SelectedShippingOptions = new Dictionary<Guid, string>
            {
                [group.GroupId] = SelectionKeyExtensions.ForShippingOption(selectedOption.ShippingOptionId)
            }
        };

        return (basket, session);
    }

    private async Task<(Warehouse Warehouse, Core.Shipping.Models.ShippingOption ShippingOption, Product Product)> SetupWarehouseAndProductAsync()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse("UK Warehouse", "GB");
        var shippingOption = dataBuilder.CreateShippingOption("Standard Delivery", warehouse, fixedCost: 5.99m);

        shippingOption.SetShippingCosts(
        [
            new Core.Shipping.Models.ShippingCost
            {
                ShippingOptionId = shippingOption.Id,
                CountryCode = "GB",
                Cost = 5.99m
            }
        ]);

        dataBuilder.AddServiceRegion(warehouse, "GB");
        warehouse.ShippingOptions.Add(shippingOption);

        var taxGroup = dataBuilder.CreateTaxGroup("Standard VAT", 20m);
        var productRoot = dataBuilder.CreateProductRoot("Test Product", taxGroup);
        var product = dataBuilder.CreateProduct("Test Product Variant", productRoot, price: 25.00m);
        product.Sku = "TEST-CONVERSION-001";

        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        return (warehouse, shippingOption, product);
    }

    private async Task<Basket> CreateBasketAsync(Product product)
    {
        var basket = _checkoutService.CreateBasket("GBP");
        var lineItem = _checkoutService.CreateLineItem(product, 1);
        await _checkoutService.AddToBasketAsync(basket, lineItem, "GB");
        await _checkoutService.CalculateBasketAsync(new CalculateBasketParameters
        {
            Basket = basket,
            CountryCode = "GB"
        });

        return basket;
    }

    private Address CreateAddress(string email, string countryCode, string firstName, string lastName)
    {
        var builder = _fixture.CreateDataBuilder();
        return builder.CreateTestAddress(
            email: email,
            countryCode: countryCode,
            firstName: firstName,
            lastName: lastName);
    }
}
