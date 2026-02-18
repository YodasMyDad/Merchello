using Merchello.Core.Accounting.Models;
using Merchello.Core.Fulfilment;
using Merchello.Core.Fulfilment.Handlers;
using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Fulfilment.Providers;
using Merchello.Core.Fulfilment.Providers.SupplierDirect;
using Merchello.Core.Fulfilment.Providers.SupplierDirect.Models;
using Merchello.Core.Fulfilment.Services.Interfaces;
using Merchello.Core.Fulfilment.Services.Parameters;
using Merchello.Core.Notifications.Payment;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Tests.Fulfilment.Providers;
using Merchello.Tests.TestInfrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Fulfilment.Integration;

[Collection("Integration Tests")]
public class SupplierDirectSubmissionIntegrationTests
{
    private readonly ServiceTestFixture _fixture;
    private readonly TestDataBuilder _dataBuilder;

    public SupplierDirectSubmissionIntegrationTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _fixture.ResetMocks();
        _dataBuilder = _fixture.CreateDataBuilder();
    }

    [Fact]
    public async Task HandleAsync_PaymentCreated_OnPaidSupplierDirect_SubmitsOrder()
    {
        var scenario = await CreateSupplierDirectOrderAsync(
            SupplierDirectSubmissionTrigger.OnPaid,
            providerKey: SupplierDirectProviderDefaults.ProviderKey,
            withSuccessfulPayment: true,
            withExistingShipment: false,
            configureProvider: true);

        var payment = await GetPaymentByInvoiceAsync(scenario.InvoiceId);

        using var scope = _fixture.CreateScope();
        var handler = scope.ServiceProvider.GetRequiredService<FulfilmentOrderSubmissionHandler>();
        await handler.HandleAsync(new PaymentCreatedNotification(payment), CancellationToken.None);

        var updatedOrder = await _fixture.DbContext.Orders
            .AsNoTracking()
            .FirstAsync(o => o.Id == scenario.OrderId);

        updatedOrder.FulfilmentProviderReference.ShouldNotBeNullOrWhiteSpace();
        updatedOrder.Status.ShouldBe(OrderStatus.Processing);
        scenario.Provider.ShouldNotBeNull();
        scenario.Provider!.SubmittedOrderIds.ShouldContain(scenario.OrderId);
    }

    [Fact]
    public async Task HandleAsync_PaymentCreated_ExplicitReleaseSupplierDirect_DoesNotSubmitOrder()
    {
        var scenario = await CreateSupplierDirectOrderAsync(
            SupplierDirectSubmissionTrigger.ExplicitRelease,
            providerKey: SupplierDirectProviderDefaults.ProviderKey,
            withSuccessfulPayment: true,
            withExistingShipment: false,
            configureProvider: true);

        var payment = await GetPaymentByInvoiceAsync(scenario.InvoiceId);

        using var scope = _fixture.CreateScope();
        var handler = scope.ServiceProvider.GetRequiredService<FulfilmentOrderSubmissionHandler>();
        await handler.HandleAsync(new PaymentCreatedNotification(payment), CancellationToken.None);

        var updatedOrder = await _fixture.DbContext.Orders
            .AsNoTracking()
            .FirstAsync(o => o.Id == scenario.OrderId);

        updatedOrder.FulfilmentProviderReference.ShouldBeNull();
        scenario.Provider.ShouldNotBeNull();
        scenario.Provider!.SubmittedOrderIds.Count.ShouldBe(0);
    }

    [Fact]
    public async Task HandleAsync_PaymentCreated_NonSupplierDirect_SubmitsOrder()
    {
        var supplier = _dataBuilder.CreateSupplier();
        supplier.ExtendedData[SupplierDirectExtendedDataKeys.Profile] = new SupplierDirectProfile
        {
            SubmissionTrigger = SupplierDirectSubmissionTrigger.ExplicitRelease,
            DeliveryMethod = SupplierDirectDeliveryMethod.Email
        }.ToJson();

        var providerConfig = _dataBuilder.CreateFulfilmentProviderConfiguration(
            providerKey: "shipbob",
            displayName: "ShipBob");
        var warehouse = _dataBuilder.CreateWarehouse(supplier: supplier);
        _dataBuilder.AssignFulfilmentProviderToWarehouse(warehouse, providerConfig);
        var shippingOption = _dataBuilder.CreateShippingOption(warehouse: warehouse);
        var invoice = _dataBuilder.CreateInvoice(total: 40m);
        var order = _dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Pending);
        _dataBuilder.CreateLineItem(order, name: "ShipBob Product", quantity: 1, amount: 40m, lineItemType: LineItemType.Product);
        _dataBuilder.CreatePayment(invoice, amount: invoice.Total);

        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var provider = new TestFulfilmentProvider();
        var registeredProvider = new RegisteredFulfilmentProvider(provider, providerConfig);
        _fixture.FulfilmentProviderManagerMock
            .Setup(x => x.GetConfiguredProviderAsync(
                It.Is<Guid>(id => id == providerConfig.Id),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(registeredProvider);

        var payment = await GetPaymentByInvoiceAsync(invoice.Id);
        using var scope = _fixture.CreateScope();
        var handler = scope.ServiceProvider.GetRequiredService<FulfilmentOrderSubmissionHandler>();
        await handler.HandleAsync(new PaymentCreatedNotification(payment), CancellationToken.None);

        var updatedOrder = await _fixture.DbContext.Orders
            .AsNoTracking()
            .FirstAsync(o => o.Id == order.Id);
        updatedOrder.FulfilmentProviderReference.ShouldNotBeNullOrWhiteSpace();
        provider.SubmittedOrders.Count.ShouldBe(1);
    }

    [Fact]
    public async Task SubmitOrderAsync_ExplicitRelease_PaidSupplierDirect_SubmitsAndAutoCreatesPreparingShipment()
    {
        var scenario = await CreateSupplierDirectOrderAsync(
            SupplierDirectSubmissionTrigger.ExplicitRelease,
            providerKey: SupplierDirectProviderDefaults.ProviderKey,
            withSuccessfulPayment: true,
            withExistingShipment: false,
            configureProvider: true);

        using var scope = _fixture.CreateScope();
        var submissionService = scope.ServiceProvider.GetRequiredService<IFulfilmentSubmissionService>();

        var result = await submissionService.SubmitOrderAsync(new SubmitFulfilmentOrderParameters
        {
            OrderId = scenario.OrderId,
            Source = FulfilmentSubmissionSource.ExplicitRelease,
            RequirePaidInvoice = true
        });

        result.Success.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject!.FulfilmentProviderReference.ShouldNotBeNullOrWhiteSpace();

        _fixture.DbContext.ChangeTracker.Clear();
        var shipments = await _fixture.DbContext.Shipments
            .AsNoTracking()
            .Where(s => s.OrderId == scenario.OrderId)
            .ToListAsync();

        shipments.Count.ShouldBe(1);
        shipments[0].Status.ShouldBe(ShipmentStatus.Preparing);
        shipments[0].LineItems.Sum(li => li.Quantity).ShouldBe(2);
        scenario.Provider.ShouldNotBeNull();
        scenario.Provider!.SubmittedOrderIds.ShouldContain(scenario.OrderId);
    }

    [Fact]
    public async Task SubmitOrderAsync_ExplicitRelease_WithExistingShipment_DoesNotCreateDuplicateShipment()
    {
        var scenario = await CreateSupplierDirectOrderAsync(
            SupplierDirectSubmissionTrigger.ExplicitRelease,
            providerKey: SupplierDirectProviderDefaults.ProviderKey,
            withSuccessfulPayment: true,
            withExistingShipment: true,
            configureProvider: true);

        var beforeCount = await _fixture.DbContext.Shipments
            .AsNoTracking()
            .CountAsync(s => s.OrderId == scenario.OrderId);
        beforeCount.ShouldBe(1);

        using var scope = _fixture.CreateScope();
        var submissionService = scope.ServiceProvider.GetRequiredService<IFulfilmentSubmissionService>();

        var result = await submissionService.SubmitOrderAsync(new SubmitFulfilmentOrderParameters
        {
            OrderId = scenario.OrderId,
            Source = FulfilmentSubmissionSource.ExplicitRelease,
            RequirePaidInvoice = true
        });

        result.Success.ShouldBeTrue();

        _fixture.DbContext.ChangeTracker.Clear();
        var afterCount = await _fixture.DbContext.Shipments
            .AsNoTracking()
            .CountAsync(s => s.OrderId == scenario.OrderId);

        afterCount.ShouldBe(1);
    }

    [Fact]
    public async Task SubmitOrderAsync_ExplicitRelease_NonSupplierDirect_ReturnsPolicyError()
    {
        var scenario = await CreateSupplierDirectOrderAsync(
            SupplierDirectSubmissionTrigger.ExplicitRelease,
            providerKey: "shipbob",
            withSuccessfulPayment: true,
            withExistingShipment: false,
            configureProvider: false);

        using var scope = _fixture.CreateScope();
        var submissionService = scope.ServiceProvider.GetRequiredService<IFulfilmentSubmissionService>();

        var result = await submissionService.SubmitOrderAsync(new SubmitFulfilmentOrderParameters
        {
            OrderId = scenario.OrderId,
            Source = FulfilmentSubmissionSource.ExplicitRelease,
            RequirePaidInvoice = true
        });

        result.Success.ShouldBeFalse();
        result.Messages.ShouldContain(m =>
            m.ResultMessageType == ResultMessageType.Error &&
            (m.Message ?? string.Empty).Contains("Supplier Direct", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task SubmitOrderAsync_ExplicitRelease_UnpaidSupplierDirect_ReturnsPaidGateError()
    {
        var scenario = await CreateSupplierDirectOrderAsync(
            SupplierDirectSubmissionTrigger.ExplicitRelease,
            providerKey: SupplierDirectProviderDefaults.ProviderKey,
            withSuccessfulPayment: false,
            withExistingShipment: false,
            configureProvider: true);

        using var scope = _fixture.CreateScope();
        var submissionService = scope.ServiceProvider.GetRequiredService<IFulfilmentSubmissionService>();

        var result = await submissionService.SubmitOrderAsync(new SubmitFulfilmentOrderParameters
        {
            OrderId = scenario.OrderId,
            Source = FulfilmentSubmissionSource.ExplicitRelease,
            RequirePaidInvoice = true
        });

        result.Success.ShouldBeFalse();
        result.Messages.ShouldContain(m =>
            m.ResultMessageType == ResultMessageType.Error &&
            (m.Message ?? string.Empty).Contains("not fully paid", StringComparison.OrdinalIgnoreCase));
        scenario.Provider.ShouldNotBeNull();
        scenario.Provider!.SubmittedOrderIds.Count.ShouldBe(0);
    }

    private async Task<(Guid OrderId, Guid InvoiceId, IntegrationSupplierDirectProvider? Provider)> CreateSupplierDirectOrderAsync(
        SupplierDirectSubmissionTrigger submissionTrigger,
        string providerKey,
        bool withSuccessfulPayment,
        bool withExistingShipment,
        bool configureProvider)
    {
        var supplier = _dataBuilder.CreateSupplier();
        supplier.ExtendedData[SupplierDirectExtendedDataKeys.Profile] = new SupplierDirectProfile
        {
            SubmissionTrigger = submissionTrigger,
            DeliveryMethod = SupplierDirectDeliveryMethod.Email
        }.ToJson();

        var providerConfig = _dataBuilder.CreateFulfilmentProviderConfiguration(
            providerKey: providerKey,
            displayName: "Integration Provider");
        var warehouse = _dataBuilder.CreateWarehouse(supplier: supplier);
        _dataBuilder.AssignFulfilmentProviderToWarehouse(warehouse, providerConfig);

        var shippingOption = _dataBuilder.CreateShippingOption(warehouse: warehouse);
        var invoice = _dataBuilder.CreateInvoice(total: 40m);
        var order = _dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Pending);
        _dataBuilder.CreateLineItem(
            order,
            name: "Supplier Product",
            quantity: 2,
            amount: 20m,
            lineItemType: LineItemType.Product);

        if (withExistingShipment)
        {
            _dataBuilder.CreateShipment(order, warehouse);
        }

        if (withSuccessfulPayment)
        {
            _dataBuilder.CreatePayment(invoice, amount: invoice.Total);
        }

        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        IntegrationSupplierDirectProvider? provider = null;
        if (configureProvider)
        {
            provider = new IntegrationSupplierDirectProvider();
            ConfigureProvider(providerConfig, provider);
        }

        return (order.Id, invoice.Id, provider);
    }

    private void ConfigureProvider(
        FulfilmentProviderConfiguration providerConfig,
        IntegrationSupplierDirectProvider provider)
    {
        var registeredProvider = new RegisteredFulfilmentProvider(provider, providerConfig);
        _fixture.FulfilmentProviderManagerMock
            .Setup(x => x.GetConfiguredProviderAsync(
                It.Is<Guid>(id => id == providerConfig.Id),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(registeredProvider);
    }

    private async Task<Payment> GetPaymentByInvoiceAsync(Guid invoiceId)
    {
        return await _fixture.DbContext.Payments
            .AsNoTracking()
            .FirstAsync(p => p.InvoiceId == invoiceId);
    }
}
