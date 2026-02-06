using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Locality.Models;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shipping.Extensions;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Shipping.Services.Parameters;
using Merchello.Core.Warehouses.Models;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Accounting.Services;

/// <summary>
/// Integration tests for the full payment lifecycle:
/// create invoice, record payment, process refund, verify status tracking.
/// </summary>
[Collection("Integration Tests")]
public class PaymentLifecycleIntegrationTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IInvoiceService _invoiceService;
    private readonly IPaymentService _paymentService;
    private readonly IShippingService _shippingService;
    private readonly ICheckoutService _checkoutService;

    public PaymentLifecycleIntegrationTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _invoiceService = fixture.GetService<IInvoiceService>();
        _paymentService = fixture.GetService<IPaymentService>();
        _shippingService = fixture.GetService<IShippingService>();
        _checkoutService = fixture.GetService<ICheckoutService>();
    }

    [Fact]
    public async Task PaymentLifecycle_UnpaidInvoice_StatusIsUnpaid()
    {
        // Arrange
        var invoice = await CreateTestInvoice();

        // Act
        var status = await _paymentService.GetInvoicePaymentStatusAsync(invoice.Id);

        // Assert
        status.ShouldBe(InvoicePaymentStatus.Unpaid);
    }

    [Fact]
    public async Task PaymentLifecycle_FullPayment_StatusIsPaid()
    {
        // Arrange
        var invoice = await CreateTestInvoice();

        // Act
        var paymentResult = await _paymentService.RecordPaymentAsync(new RecordPaymentParameters
        {
            InvoiceId = invoice.Id,
            ProviderAlias = "manual",
            TransactionId = $"txn-{Guid.NewGuid()}",
            Amount = invoice.Total
        });
        paymentResult.Success.ShouldBeTrue();

        _fixture.DbContext.ChangeTracker.Clear();

        var status = await _paymentService.GetInvoicePaymentStatusAsync(invoice.Id);

        // Assert
        status.ShouldBe(InvoicePaymentStatus.Paid);
    }

    [Fact]
    public async Task PaymentLifecycle_PartialPayment_StatusIsPartiallyPaid()
    {
        // Arrange
        var invoice = await CreateTestInvoice();
        var partialAmount = Math.Round(invoice.Total / 2, 2);

        // Act
        var paymentResult = await _paymentService.RecordPaymentAsync(new RecordPaymentParameters
        {
            InvoiceId = invoice.Id,
            ProviderAlias = "manual",
            TransactionId = $"txn-{Guid.NewGuid()}",
            Amount = partialAmount
        });
        paymentResult.Success.ShouldBeTrue();

        _fixture.DbContext.ChangeTracker.Clear();

        var status = await _paymentService.GetInvoicePaymentStatusAsync(invoice.Id);

        // Assert
        status.ShouldBe(InvoicePaymentStatus.PartiallyPaid);
    }

    [Fact]
    public async Task PaymentLifecycle_FullRefund_StatusIsRefunded()
    {
        // Arrange
        var invoice = await CreateTestInvoice();

        var paymentResult = await _paymentService.RecordPaymentAsync(new RecordPaymentParameters
        {
            InvoiceId = invoice.Id,
            ProviderAlias = "manual",
            TransactionId = $"txn-{Guid.NewGuid()}",
            Amount = invoice.Total
        });
        paymentResult.Success.ShouldBeTrue();
        var payment = paymentResult.ResultObject!;

        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var refundResult = await _paymentService.ProcessRefundAsync(new ProcessRefundParameters
        {
            PaymentId = payment.Id,
            Amount = invoice.Total,
            Reason = "Customer request"
        });
        refundResult.Success.ShouldBeTrue();

        _fixture.DbContext.ChangeTracker.Clear();

        var status = await _paymentService.GetInvoicePaymentStatusAsync(invoice.Id);

        // Assert
        status.ShouldBe(InvoicePaymentStatus.Refunded);
    }

    [Fact]
    public async Task PaymentLifecycle_DuplicateTransactionId_ReturnsExistingPayment()
    {
        // Arrange
        var invoice = await CreateTestInvoice();
        var transactionId = $"txn-{Guid.NewGuid()}";

        // Act - Record first payment
        var firstResult = await _paymentService.RecordPaymentAsync(new RecordPaymentParameters
        {
            InvoiceId = invoice.Id,
            ProviderAlias = "manual",
            TransactionId = transactionId,
            Amount = invoice.Total
        });
        firstResult.Success.ShouldBeTrue();
        var firstPayment = firstResult.ResultObject!;

        _fixture.DbContext.ChangeTracker.Clear();

        // Act - Record same transaction again (idempotent)
        var secondResult = await _paymentService.RecordPaymentAsync(new RecordPaymentParameters
        {
            InvoiceId = invoice.Id,
            ProviderAlias = "manual",
            TransactionId = transactionId,
            Amount = invoice.Total
        });

        // Assert - Should return the existing payment rather than creating a duplicate
        secondResult.Success.ShouldBeTrue();
        var secondPayment = secondResult.ResultObject!;
        secondPayment.Id.ShouldBe(firstPayment.Id);
    }

    /// <summary>
    /// Helper to create a test invoice via the full basket-to-invoice flow.
    /// Each test gets its own isolated data.
    /// </summary>
    private async Task<Invoice> CreateTestInvoice()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse("Test Warehouse", "GB");
        var shippingOption = dataBuilder.CreateShippingOption("Standard Delivery", warehouse, fixedCost: 5.00m);

        shippingOption.ShippingCosts.Add(new ShippingCost
        {
            CountryCode = "GB",
            Cost = 5.00m
        });

        dataBuilder.AddServiceRegion(warehouse, "GB");
        warehouse.ShippingOptions.Add(shippingOption);

        var taxGroup = dataBuilder.CreateTaxGroup("Standard VAT", 20m);
        var productRoot = dataBuilder.CreateProductRoot("Test Product", taxGroup);
        var product = dataBuilder.CreateProduct("Product Variant", productRoot, price: 50.00m);
        product.Sku = $"TEST-{Guid.NewGuid():N}"[..12];

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

        var billingAddress = dataBuilder.CreateTestAddress(
            email: "test@test.com",
            countryCode: "GB",
            firstName: "Test",
            lastName: "Customer");
        var shippingAddress = dataBuilder.CreateTestAddress(
            email: "test@test.com",
            countryCode: "GB",
            firstName: "Test",
            lastName: "Customer");

        var shippingResult = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = shippingAddress
            });
        shippingResult.WarehouseGroups.ShouldNotBeEmpty();

        var group = shippingResult.WarehouseGroups.First();
        var selectedOption = group.AvailableShippingOptions.First();
        var selectedShippingOptions = new Dictionary<Guid, string>
        {
            [group.GroupId] = SelectionKeyExtensions.ForShippingOption(selectedOption.ShippingOptionId)
        };

        var checkoutSession = new CheckoutSession
        {
            BasketId = basket.Id,
            BillingAddress = billingAddress,
            ShippingAddress = shippingAddress,
            SelectedShippingOptions = selectedShippingOptions
        };

        var result = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);
        result.Success.ShouldBeTrue();

        _fixture.DbContext.ChangeTracker.Clear();

        return result.ResultObject!;
    }
}
