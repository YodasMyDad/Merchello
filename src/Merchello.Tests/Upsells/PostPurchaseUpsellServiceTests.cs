using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Data;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shared;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shipping.Extensions;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Upsells.Dtos;
using Merchello.Core.Upsells.Models;
using Merchello.Core.Upsells.Services;
using Merchello.Core.Upsells.Services.Interfaces;
using Merchello.Core.Upsells.Services.Parameters;
using Merchello.Tests.TestInfrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Shouldly;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace Merchello.Tests.Upsells;

[Collection("Integration Tests")]
public class PostPurchaseUpsellServiceTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IInvoiceService _invoiceService;

    public PostPurchaseUpsellServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _invoiceService = fixture.GetService<IInvoiceService>();
    }

    [Fact]
    public async Task AddToOrderAsync_WhenPaymentRecordingFails_ReturnsFailureAndSkipsInvoiceEdit()
    {
        var (invoice, upsellProduct) = await CreatePostPurchaseScenarioAsync();

        var savedMethodId = Guid.NewGuid();
        var savedMethodServiceMock = CreateSavedMethodServiceMock(invoice.CustomerId, savedMethodId);

        var invoiceEditServiceMock = new Mock<IInvoiceEditService>();
        invoiceEditServiceMock
            .Setup(x => x.PreviewInvoiceEditAsync(
                invoice.Id,
                It.IsAny<EditInvoiceDto>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreatePreviewResult(invoice));
        invoiceEditServiceMock
            .Setup(x => x.EditInvoiceAsync(
                It.IsAny<EditInvoiceParameters>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(OperationResult<EditInvoiceResultDto>.Ok(new EditInvoiceResultDto
            {
                IsSuccessful = true
            }));

        var paymentServiceMock = new Mock<IPaymentService>();
        var failedRecord = new CrudResult<Payment>();
        failedRecord.AddErrorMessage("Record payment failed.");
        paymentServiceMock
            .Setup(x => x.RecordPaymentAsync(
                It.IsAny<RecordPaymentParameters>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(failedRecord);

        var analyticsServiceMock = new Mock<IUpsellAnalyticsService>();
        analyticsServiceMock
            .Setup(x => x.RecordConversionAsync(
                It.IsAny<RecordUpsellConversionParameters>(),
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var service = CreateService(
            invoiceEditServiceMock.Object,
            savedMethodServiceMock.Object,
            paymentServiceMock.Object,
            analyticsServiceMock.Object);

        var result = await service.AddToOrderAsync(new AddPostPurchaseUpsellParameters
        {
            InvoiceId = invoice.Id,
            ProductId = upsellProduct.Id,
            Quantity = 1,
            UpsellRuleId = Guid.NewGuid(),
            SavedPaymentMethodId = savedMethodId,
            IdempotencyKey = "post-purchase-idem-failed"
        });

        result.Success.ShouldBeFalse();
        result.ErrorMessage.ShouldNotBeNull();
        result.ErrorMessage.ShouldContain("failed to record");

        invoiceEditServiceMock.Verify(
            x => x.EditInvoiceAsync(It.IsAny<EditInvoiceParameters>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task AddToOrderAsync_WhenPaymentRecordingSucceeds_ContinuesToInvoiceEdit()
    {
        var (invoice, upsellProduct) = await CreatePostPurchaseScenarioAsync();

        var savedMethodId = Guid.NewGuid();
        var savedMethodServiceMock = CreateSavedMethodServiceMock(
            invoice.CustomerId,
            savedMethodId,
            chargeTransactionId: null);

        var invoiceEditServiceMock = new Mock<IInvoiceEditService>();
        invoiceEditServiceMock
            .Setup(x => x.PreviewInvoiceEditAsync(
                invoice.Id,
                It.IsAny<EditInvoiceDto>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreatePreviewResult(invoice));
        invoiceEditServiceMock
            .Setup(x => x.EditInvoiceAsync(
                It.IsAny<EditInvoiceParameters>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(OperationResult<EditInvoiceResultDto>.Ok(new EditInvoiceResultDto
            {
                IsSuccessful = true
            }));

        var paymentServiceMock = new Mock<IPaymentService>();
        RecordPaymentParameters? capturedRecordParameters = null;
        paymentServiceMock
            .Setup(x => x.RecordPaymentAsync(
                It.IsAny<RecordPaymentParameters>(),
                It.IsAny<CancellationToken>()))
            .Callback<RecordPaymentParameters, CancellationToken>((parameters, _) => capturedRecordParameters = parameters)
            .ReturnsAsync(new CrudResult<Payment>
            {
                ResultObject = new Payment
                {
                    Id = Guid.NewGuid(),
                    InvoiceId = invoice.Id,
                    TransactionId = "pp_txn_123",
                    Amount = 12m,
                    CurrencyCode = invoice.CurrencyCode,
                    PaymentSuccess = true
                }
            });

        var analyticsServiceMock = new Mock<IUpsellAnalyticsService>();
        analyticsServiceMock
            .Setup(x => x.RecordConversionAsync(
                It.IsAny<RecordUpsellConversionParameters>(),
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var service = CreateService(
            invoiceEditServiceMock.Object,
            savedMethodServiceMock.Object,
            paymentServiceMock.Object,
            analyticsServiceMock.Object);

        var result = await service.AddToOrderAsync(new AddPostPurchaseUpsellParameters
        {
            InvoiceId = invoice.Id,
            ProductId = upsellProduct.Id,
            Quantity = 1,
            UpsellRuleId = Guid.NewGuid(),
            SavedPaymentMethodId = savedMethodId,
            IdempotencyKey = "post-purchase-idem-success"
        });

        result.Success.ShouldBeTrue();
        result.Data.ShouldNotBeNull();
        result.Data.Success.ShouldBeTrue();
        result.Data.AmountCharged.ShouldBeGreaterThan(0m);
        capturedRecordParameters.ShouldNotBeNull();
        result.Data.PaymentTransactionId.ShouldBe(capturedRecordParameters!.TransactionId);
        result.Data.PaymentTransactionId.ShouldNotBeNull();

        invoiceEditServiceMock.Verify(
            x => x.EditInvoiceAsync(It.IsAny<EditInvoiceParameters>(), It.IsAny<CancellationToken>()),
            Times.Once);
        paymentServiceMock.Verify(
            x => x.RecordPaymentAsync(It.IsAny<RecordPaymentParameters>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    private PostPurchaseUpsellService CreateService(
        IInvoiceEditService invoiceEditService,
        ISavedPaymentMethodService savedPaymentMethodService,
        IPaymentService paymentService,
        IUpsellAnalyticsService analyticsService)
    {
        return new PostPurchaseUpsellService(
            _fixture.GetService<IEFCoreScopeProvider<MerchelloDbContext>>(),
            _fixture.GetService<IInvoiceService>(),
            invoiceEditService,
            _fixture.GetService<LineItemFactory>(),
            _fixture.GetService<Merchello.Core.Checkout.Factories.BasketFactory>(),
            savedPaymentMethodService,
            paymentService,
            _fixture.GetService<Merchello.Core.Payments.Providers.Interfaces.IPaymentProviderManager>(),
            _fixture.GetService<IUpsellEngine>(),
            analyticsService,
            _fixture.GetService<Merchello.Core.Shared.Services.Interfaces.ICurrencyService>(),
            _fixture.GetService<Merchello.Core.Shipping.Services.Interfaces.IShippingService>(),
            _fixture.GetService<Merchello.Core.Checkout.Strategies.Interfaces.IOrderGroupingStrategyResolver>(),
            _fixture.GetService<IUpsellContextBuilder>(),
            _fixture.GetService<IInventoryService>(),
            _fixture.GetService<Microsoft.Extensions.Options.IOptions<MerchelloSettings>>(),
            _fixture.GetService<Microsoft.Extensions.Options.IOptions<UpsellSettings>>(),
            NullLogger<PostPurchaseUpsellService>.Instance);
    }

    private static Mock<ISavedPaymentMethodService> CreateSavedMethodServiceMock(
        Guid customerId,
        Guid savedMethodId,
        string? chargeTransactionId = "pp_charge_txn_123")
    {
        var savedMethodServiceMock = new Mock<ISavedPaymentMethodService>();
        savedMethodServiceMock
            .Setup(x => x.GetPaymentMethodAsync(savedMethodId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SavedPaymentMethod
            {
                Id = savedMethodId,
                CustomerId = customerId,
                ProviderAlias = "stripe",
                ProviderMethodId = "pm_test_123",
                ProviderCustomerId = "cus_test_123",
                MethodType = SavedPaymentMethodType.Card,
                CardBrand = "visa",
                Last4 = "4242",
                ExpiryMonth = 12,
                ExpiryYear = DateTime.UtcNow.Year + 2,
                DisplayLabel = "Visa ending in 4242"
            });
        savedMethodServiceMock
            .Setup(x => x.ChargeAsync(It.IsAny<ChargeSavedMethodParameters>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CrudResult<PaymentResult>
            {
                ResultObject = new PaymentResult
                {
                    Success = true,
                    Status = PaymentResultStatus.Completed,
                    TransactionId = chargeTransactionId,
                    Amount = 12m
                }
            });
        return savedMethodServiceMock;
    }

    private static PreviewEditResultDto CreatePreviewResult(Invoice invoice)
    {
        var currentShipping = invoice.Orders?.Sum(o => o.ShippingCost) ?? 0m;
        var subTotal = invoice.SubTotal + 10m;
        var tax = invoice.Tax + 2m;
        var total = subTotal + tax + currentShipping;

        return new PreviewEditResultDto
        {
            CurrencyCode = invoice.CurrencyCode,
            CurrencySymbol = invoice.CurrencySymbol,
            StoreCurrencyCode = invoice.StoreCurrencyCode,
            StoreCurrencySymbol = invoice.CurrencySymbol,
            PricingExchangeRate = invoice.PricingExchangeRate,
            SubTotal = subTotal,
            DiscountTotal = 0m,
            AdjustedSubTotal = subTotal,
            ShippingTotal = currentShipping,
            Tax = tax,
            Total = total,
            TotalInStoreCurrency = total
        };
    }

    private async Task<(Invoice Invoice, Product UpsellProduct)> CreatePostPurchaseScenarioAsync()
    {
        var dataBuilder = _fixture.CreateDataBuilder();

        var warehouse = dataBuilder.CreateWarehouse("Post Purchase Warehouse", "GB");
        var shippingOption = dataBuilder.CreateShippingOption("Standard Delivery", warehouse, fixedCost: 5m);
        shippingOption.SetShippingCosts(
        [
            new ShippingCost
            {
                ShippingOptionId = shippingOption.Id,
                CountryCode = "GB",
                Cost = 5m
            }
        ]);
        dataBuilder.AddServiceRegion(warehouse, "GB");

        var taxGroup = dataBuilder.CreateTaxGroup("Standard VAT", 20m);

        var baseRoot = dataBuilder.CreateProductRoot("Base Product", taxGroup);
        var baseProduct = dataBuilder.CreateProduct("Base Product Variant", baseRoot, price: 40m);
        dataBuilder.AddWarehouseToProductRoot(baseRoot, warehouse);
        dataBuilder.CreateProductWarehouse(baseProduct, warehouse, stock: 100);

        var upsellRoot = dataBuilder.CreateProductRoot("Upsell Product", taxGroup);
        var upsellProduct = dataBuilder.CreateProduct("Upsell Product Variant", upsellRoot, price: 12m);
        dataBuilder.AddWarehouseToProductRoot(upsellRoot, warehouse);
        dataBuilder.CreateProductWarehouse(upsellProduct, warehouse, stock: 100);

        var customer = dataBuilder.CreateCustomer("postpurchase@example.com", "Post", "Purchase");
        var invoice = dataBuilder.CreateInvoice(customerEmail: customer.Email, total: 48m, customer: customer);
        var order = dataBuilder.CreateOrder(invoice, warehouse, shippingOption, status: OrderStatus.Pending);
        dataBuilder.CreateLineItem(
            order,
            product: baseProduct,
            name: "Base Product",
            quantity: 1,
            amount: 40m,
            taxRate: 20m);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var dbInvoice = await _fixture.DbContext.Invoices.FirstAsync(i => i.Id == invoice.Id);
        dbInvoice.ExtendedData["PostPurchaseEligible"] = true;
        dbInvoice.ExtendedData["PostPurchaseWindowStartUtc"] = DateTime.UtcNow.ToString("O");
        dbInvoice.ExtendedData["PostPurchaseWindowEndsUtc"] = DateTime.UtcNow.AddMinutes(10).ToString("O");

        await _fixture.DbContext.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var reloadedInvoice = await _invoiceService.GetInvoiceAsync(invoice.Id);
        reloadedInvoice.ShouldNotBeNull();

        return (reloadedInvoice, upsellProduct);
    }
}
