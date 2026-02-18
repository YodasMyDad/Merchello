using Merchello.Core.Accounting.Models;
using Merchello.Core.Data;
using Merchello.Core.Fulfilment;
using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Fulfilment.Notifications;
using Merchello.Core.Fulfilment.Providers.SupplierDirect;
using Merchello.Core.Fulfilment.Providers.SupplierDirect.Models;
using Merchello.Core.Fulfilment.Services;
using Merchello.Core.Fulfilment.Services.Interfaces;
using Merchello.Core.Fulfilment.Services.Parameters;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Suppliers.Models;
using Merchello.Core.Warehouses.Models;
using Merchello.Core.Warehouses.Services.Interfaces;
using Merchello.Tests.TestInfrastructure;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Shouldly;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace Merchello.Tests.Fulfilment.Services;

[Collection("Integration Tests")]
public class FulfilmentSubmissionServiceTests
{
    private readonly ServiceTestFixture _fixture;
    private readonly TestDataBuilder _dataBuilder;

    public FulfilmentSubmissionServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _dataBuilder = _fixture.CreateDataBuilder();
    }

    [Fact]
    public async Task SubmitOrderAsync_SupplierDirectOnPaidAndPaymentCreated_SubmitsOrder()
    {
        var context = await CreateOrderContextAsync(SupplierDirectSubmissionTrigger.OnPaid);
        var providerConfig = CreateProviderConfig(SupplierDirectProviderDefaults.ProviderKey);

        var fulfilmentServiceMock = new Mock<IFulfilmentService>();
        fulfilmentServiceMock
            .Setup(x => x.ResolveProviderForWarehouseAsync(context.Warehouse.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(providerConfig);
        fulfilmentServiceMock
            .Setup(x => x.SubmitOrderAsync(context.Order.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateSubmittedResult(context.Order.Id));

        var warehouseServiceMock = new Mock<IWarehouseService>();
        warehouseServiceMock
            .Setup(x => x.GetWarehouseByIdAsync(context.Warehouse.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(context.Warehouse);

        var service = CreateService(fulfilmentServiceMock, warehouseServiceMock: warehouseServiceMock);

        var result = await service.SubmitOrderAsync(new SubmitFulfilmentOrderParameters
        {
            OrderId = context.Order.Id,
            Source = FulfilmentSubmissionSource.PaymentCreated,
            RequirePaidInvoice = false
        });

        result.Success.ShouldBeTrue();
        fulfilmentServiceMock.Verify(x => x.SubmitOrderAsync(context.Order.Id, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SubmitOrderAsync_SupplierDirectExplicitReleaseAndPaymentCreated_SkipsSubmission()
    {
        var context = await CreateOrderContextAsync(SupplierDirectSubmissionTrigger.ExplicitRelease);
        var providerConfig = CreateProviderConfig(SupplierDirectProviderDefaults.ProviderKey);

        var fulfilmentServiceMock = new Mock<IFulfilmentService>();
        fulfilmentServiceMock
            .Setup(x => x.ResolveProviderForWarehouseAsync(context.Warehouse.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(providerConfig);

        var warehouseServiceMock = new Mock<IWarehouseService>();
        warehouseServiceMock
            .Setup(x => x.GetWarehouseByIdAsync(context.Warehouse.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(context.Warehouse);

        var service = CreateService(fulfilmentServiceMock, warehouseServiceMock: warehouseServiceMock);

        var result = await service.SubmitOrderAsync(new SubmitFulfilmentOrderParameters
        {
            OrderId = context.Order.Id,
            Source = FulfilmentSubmissionSource.PaymentCreated,
            RequirePaidInvoice = false
        });

        result.Success.ShouldBeTrue();
        result.Messages.ShouldContain(message => message.ResultMessageType == ResultMessageType.Warning);
        fulfilmentServiceMock.Verify(x => x.SubmitOrderAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SubmitOrderAsync_SupplierDirectOnPaidAndExplicitRelease_ReturnsError()
    {
        var context = await CreateOrderContextAsync(SupplierDirectSubmissionTrigger.OnPaid);
        var providerConfig = CreateProviderConfig(SupplierDirectProviderDefaults.ProviderKey);

        var fulfilmentServiceMock = new Mock<IFulfilmentService>();
        fulfilmentServiceMock
            .Setup(x => x.ResolveProviderForWarehouseAsync(context.Warehouse.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(providerConfig);

        var warehouseServiceMock = new Mock<IWarehouseService>();
        warehouseServiceMock
            .Setup(x => x.GetWarehouseByIdAsync(context.Warehouse.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(context.Warehouse);

        var service = CreateService(fulfilmentServiceMock, warehouseServiceMock: warehouseServiceMock);

        var result = await service.SubmitOrderAsync(new SubmitFulfilmentOrderParameters
        {
            OrderId = context.Order.Id,
            Source = FulfilmentSubmissionSource.ExplicitRelease,
            RequirePaidInvoice = false
        });

        result.Success.ShouldBeFalse();
        result.Messages.ShouldContain(message => message.ResultMessageType == ResultMessageType.Error);
        fulfilmentServiceMock.Verify(x => x.SubmitOrderAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SubmitOrderAsync_ExplicitReleaseWithUnpaidInvoice_ReturnsError()
    {
        var context = await CreateOrderContextAsync(SupplierDirectSubmissionTrigger.ExplicitRelease);
        var providerConfig = CreateProviderConfig(SupplierDirectProviderDefaults.ProviderKey);

        var fulfilmentServiceMock = new Mock<IFulfilmentService>();
        fulfilmentServiceMock
            .Setup(x => x.ResolveProviderForWarehouseAsync(context.Warehouse.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(providerConfig);

        var warehouseServiceMock = new Mock<IWarehouseService>();
        warehouseServiceMock
            .Setup(x => x.GetWarehouseByIdAsync(context.Warehouse.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(context.Warehouse);

        var paymentServiceMock = new Mock<IPaymentService>();
        paymentServiceMock
            .Setup(x => x.GetInvoicePaymentStatusAsync(context.Order.InvoiceId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(InvoicePaymentStatus.Unpaid);

        var service = CreateService(
            fulfilmentServiceMock,
            paymentServiceMock,
            warehouseServiceMock: warehouseServiceMock);

        var result = await service.SubmitOrderAsync(new SubmitFulfilmentOrderParameters
        {
            OrderId = context.Order.Id,
            Source = FulfilmentSubmissionSource.ExplicitRelease,
            RequirePaidInvoice = true
        });

        result.Success.ShouldBeFalse();
        result.Messages.ShouldContain(message =>
            message.ResultMessageType == ResultMessageType.Error &&
            (message.Message ?? string.Empty).Contains("not fully paid", StringComparison.OrdinalIgnoreCase));
        fulfilmentServiceMock.Verify(x => x.SubmitOrderAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SubmitOrderAsync_NonSupplierDirectAndExplicitRelease_ReturnsError()
    {
        var context = await CreateOrderContextAsync(SupplierDirectSubmissionTrigger.OnPaid);
        var providerConfig = CreateProviderConfig("shipbob");

        var fulfilmentServiceMock = new Mock<IFulfilmentService>();
        fulfilmentServiceMock
            .Setup(x => x.ResolveProviderForWarehouseAsync(context.Warehouse.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(providerConfig);

        var service = CreateService(fulfilmentServiceMock);

        var result = await service.SubmitOrderAsync(new SubmitFulfilmentOrderParameters
        {
            OrderId = context.Order.Id,
            Source = FulfilmentSubmissionSource.ExplicitRelease,
            RequirePaidInvoice = true
        });

        result.Success.ShouldBeFalse();
        result.Messages.ShouldContain(message =>
            message.ResultMessageType == ResultMessageType.Error &&
            (message.Message ?? string.Empty).Contains("Supplier Direct", StringComparison.OrdinalIgnoreCase));
        fulfilmentServiceMock.Verify(x => x.SubmitOrderAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SubmitOrderAsync_AlreadySubmitted_IsIdempotent()
    {
        var context = await CreateOrderContextAsync(SupplierDirectSubmissionTrigger.OnPaid, fulfilmentProviderReference: "EXISTING-REF");

        var fulfilmentServiceMock = new Mock<IFulfilmentService>();
        var service = CreateService(fulfilmentServiceMock);

        var result = await service.SubmitOrderAsync(new SubmitFulfilmentOrderParameters
        {
            OrderId = context.Order.Id,
            Source = FulfilmentSubmissionSource.ExplicitRelease,
            RequirePaidInvoice = true
        });

        result.Success.ShouldBeTrue();
        result.Messages.ShouldContain(message => message.ResultMessageType == ResultMessageType.Warning);
        fulfilmentServiceMock.Verify(x => x.ResolveProviderForWarehouseAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
        fulfilmentServiceMock.Verify(x => x.SubmitOrderAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SubmitOrderAsync_NonSupplierDirectAndPaymentCreated_SubmitsOrder()
    {
        var context = await CreateOrderContextAsync(SupplierDirectSubmissionTrigger.OnPaid);
        var providerConfig = CreateProviderConfig("shipbob");

        var fulfilmentServiceMock = new Mock<IFulfilmentService>();
        fulfilmentServiceMock
            .Setup(x => x.ResolveProviderForWarehouseAsync(context.Warehouse.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(providerConfig);
        fulfilmentServiceMock
            .Setup(x => x.SubmitOrderAsync(context.Order.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateSubmittedResult(context.Order.Id, "SHIPBOB-REF"));

        var service = CreateService(fulfilmentServiceMock);

        var result = await service.SubmitOrderAsync(new SubmitFulfilmentOrderParameters
        {
            OrderId = context.Order.Id,
            Source = FulfilmentSubmissionSource.PaymentCreated,
            RequirePaidInvoice = false
        });

        result.Success.ShouldBeTrue();
        fulfilmentServiceMock.Verify(x => x.SubmitOrderAsync(context.Order.Id, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SubmitOrderAsync_SubmittingNotificationCancelled_DoesNotSubmitOrder()
    {
        var context = await CreateOrderContextAsync(SupplierDirectSubmissionTrigger.ExplicitRelease);
        var providerConfig = CreateProviderConfig(SupplierDirectProviderDefaults.ProviderKey);

        var fulfilmentServiceMock = new Mock<IFulfilmentService>();
        fulfilmentServiceMock
            .Setup(x => x.ResolveProviderForWarehouseAsync(context.Warehouse.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(providerConfig);

        var warehouseServiceMock = new Mock<IWarehouseService>();
        warehouseServiceMock
            .Setup(x => x.GetWarehouseByIdAsync(context.Warehouse.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(context.Warehouse);

        var notificationPublisherMock = CreateNotificationPublisherMock();
        notificationPublisherMock
            .Setup(x => x.PublishCancelableAsync(It.IsAny<FulfilmentSubmittingNotification>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var service = CreateService(
            fulfilmentServiceMock,
            warehouseServiceMock: warehouseServiceMock,
            notificationPublisherMock: notificationPublisherMock);

        var result = await service.SubmitOrderAsync(new SubmitFulfilmentOrderParameters
        {
            OrderId = context.Order.Id,
            Source = FulfilmentSubmissionSource.ExplicitRelease,
            RequirePaidInvoice = false
        });

        result.Success.ShouldBeFalse();
        fulfilmentServiceMock.Verify(x => x.SubmitOrderAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    private async Task<(Order Order, Warehouse Warehouse)> CreateOrderContextAsync(
        SupplierDirectSubmissionTrigger trigger,
        string? fulfilmentProviderReference = null)
    {
        var supplier = _dataBuilder.CreateSupplier();
        supplier.ExtendedData[SupplierDirectExtendedDataKeys.Profile] = new SupplierDirectProfile
        {
            SubmissionTrigger = trigger,
            DeliveryMethod = SupplierDirectDeliveryMethod.Email
        }.ToJson();

        var warehouse = _dataBuilder.CreateWarehouse(supplier: supplier);
        var shippingOption = _dataBuilder.CreateShippingOption(warehouse: warehouse);
        var invoice = _dataBuilder.CreateInvoice();
        var order = _dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Pending);
        order.FulfilmentProviderReference = fulfilmentProviderReference;

        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        return (order, warehouse);
    }

    private FulfilmentSubmissionService CreateService(
        Mock<IFulfilmentService> fulfilmentServiceMock,
        Mock<IPaymentService>? paymentServiceMock = null,
        Mock<IWarehouseService>? warehouseServiceMock = null,
        Mock<IMerchelloNotificationPublisher>? notificationPublisherMock = null)
    {
        if (paymentServiceMock == null)
        {
            paymentServiceMock = new Mock<IPaymentService>();
            paymentServiceMock
                .Setup(x => x.GetInvoicePaymentStatusAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(InvoicePaymentStatus.Paid);
        }

        warehouseServiceMock ??= new Mock<IWarehouseService>();
        notificationPublisherMock ??= CreateNotificationPublisherMock();

        return new FulfilmentSubmissionService(
            _fixture.GetService<IEFCoreScopeProvider<MerchelloDbContext>>(),
            fulfilmentServiceMock.Object,
            paymentServiceMock.Object,
            warehouseServiceMock.Object,
            notificationPublisherMock.Object,
            Options.Create(new FulfilmentSettings { MaxRetryAttempts = 5 }),
            NullLogger<FulfilmentSubmissionService>.Instance);
    }

    private static Mock<IMerchelloNotificationPublisher> CreateNotificationPublisherMock()
    {
        var notificationPublisherMock = new Mock<IMerchelloNotificationPublisher>();
        notificationPublisherMock
            .Setup(x => x.PublishCancelableAsync(It.IsAny<FulfilmentSubmittingNotification>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        notificationPublisherMock
            .Setup(x => x.PublishAsync(It.IsAny<FulfilmentSubmittedNotification>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        notificationPublisherMock
            .Setup(x => x.PublishAsync(It.IsAny<FulfilmentSubmissionFailedNotification>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        notificationPublisherMock
            .Setup(x => x.PublishAsync(It.IsAny<FulfilmentSubmissionAttemptFailedNotification>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        return notificationPublisherMock;
    }

    private static FulfilmentProviderConfiguration CreateProviderConfig(string providerKey)
    {
        return new FulfilmentProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = providerKey,
            DisplayName = providerKey
        };
    }

    private static CrudResult<Order> CreateSubmittedResult(Guid orderId, string reference = "SUPPLIER-REF")
    {
        return new CrudResult<Order>
        {
            ResultObject = new Order
            {
                Id = orderId,
                FulfilmentProviderReference = reference,
                Status = OrderStatus.Processing
            }
        };
    }
}
