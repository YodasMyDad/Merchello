using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Checkout.Models;
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
[Collection("Integration")]
public class PaymentLifecycleIntegrationTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IInvoiceService _invoiceService;
    private readonly IPaymentService _paymentService;
    private readonly IShippingService _shippingService;

    public PaymentLifecycleIntegrationTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _invoiceService = fixture.GetService<IInvoiceService>();
        _paymentService = fixture.GetService<IPaymentService>();
        _shippingService = fixture.GetService<IShippingService>();
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
        paymentResult.Successful.ShouldBeTrue();

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
        paymentResult.Successful.ShouldBeTrue();

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
        paymentResult.Successful.ShouldBeTrue();
        var payment = paymentResult.ResultObject!;

        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var refundResult = await _paymentService.ProcessRefundAsync(new ProcessRefundParameters
        {
            PaymentId = payment.Id,
            Amount = invoice.Total,
            Reason = "Customer request"
        });
        refundResult.Successful.ShouldBeTrue();

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
        firstResult.Successful.ShouldBeTrue();
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
        secondResult.Successful.ShouldBeTrue();
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

        warehouse.ServiceRegions.Add(new WarehouseServiceRegion
        {
            CountryCode = "GB",
            IsExcluded = false
        });
        warehouse.ShippingOptions.Add(shippingOption);

        var taxGroup = dataBuilder.CreateTaxGroup("Standard VAT", 20m);
        var productRoot = dataBuilder.CreateProductRoot("Test Product", taxGroup);
        var product = dataBuilder.CreateProduct("Product Variant", productRoot, price: 50.00m);
        product.Sku = $"TEST-{Guid.NewGuid():N}"[..12];

        _fixture.DbContext.ProductRootWarehouses.Add(new ProductRootWarehouse
        {
            ProductRootId = productRoot.Id,
            WarehouseId = warehouse.Id,
            PriorityOrder = 1
        });
        _fixture.DbContext.ProductWarehouses.Add(new ProductWarehouse
        {
            ProductId = product.Id,
            WarehouseId = warehouse.Id,
            Stock = 100
        });

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var basket = new Basket
        {
            Id = Guid.NewGuid(),
            Currency = "GBP",
            LineItems =
            [
                new LineItem
                {
                    Id = Guid.NewGuid(),
                    ProductId = product.Id,
                    Name = product.Name,
                    Sku = product.Sku,
                    Quantity = 1,
                    Amount = 50.00m,
                    LineItemType = LineItemType.Product,
                    IsTaxable = true,
                    TaxRate = 20m
                }
            ],
            SubTotal = 50.00m,
            Tax = 10.00m,
            Total = 60.00m
        };

        var billingAddress = new Address
        {
            Name = "Test Customer",
            Email = "test@test.com",
            AddressOne = "123 Test St",
            TownCity = "London",
            CountryCode = "GB",
            PostalCode = "SW1A 1AA"
        };

        var shippingAddress = new Address
        {
            Name = "Test Customer",
            Email = "test@test.com",
            AddressOne = "123 Test St",
            TownCity = "London",
            CountryCode = "GB",
            PostalCode = "SW1A 1AA"
        };

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
        result.Successful.ShouldBeTrue();

        _fixture.DbContext.ChangeTracker.Clear();

        return result.ResultObject!;
    }
}
