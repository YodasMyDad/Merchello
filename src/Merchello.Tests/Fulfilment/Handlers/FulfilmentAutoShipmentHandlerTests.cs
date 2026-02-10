using Merchello.Core.Accounting.Models;
using Merchello.Core.Data;
using Merchello.Core.Email.Services.Interfaces;
using Merchello.Core.Fulfilment.Handlers;
using Merchello.Core.Fulfilment.Notifications;
using Merchello.Core.Fulfilment.Providers;
using Merchello.Core.Fulfilment.Providers.Interfaces;
using Merchello.Core.Fulfilment.Providers.SupplierDirect;
using Merchello.Core.Fulfilment.Providers.SupplierDirect.Csv;
using Merchello.Core.Fulfilment.Providers.SupplierDirect.Transport;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Shipping.Services.Parameters;
using Merchello.Core.Shared.Models;
using Merchello.Tests.Fulfilment.Providers;
using Merchello.Tests.TestInfrastructure;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Shouldly;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace Merchello.Tests.Fulfilment.Handlers;

[Collection("Integration Tests")]
public class FulfilmentAutoShipmentHandlerTests
{
    private readonly ServiceTestFixture _fixture;
    private readonly TestDataBuilder _dataBuilder;

    public FulfilmentAutoShipmentHandlerTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _dataBuilder = _fixture.CreateDataBuilder();
    }

    [Fact]
    public async Task HandleAsync_WhenProviderCreatesShipments_CreatesPreparingShipmentOnce()
    {
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration(
            providerKey: SupplierDirectProviderDefaults.ProviderKey,
            displayName: "Supplier Direct");
        var warehouse = _dataBuilder.CreateWarehouse();
        var shippingOption = _dataBuilder.CreateShippingOption(warehouse: warehouse);
        var invoice = _dataBuilder.CreateInvoice();
        var order = _dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Processing);
        _dataBuilder.CreateLineItem(order, name: "Product line", lineItemType: LineItemType.Product, quantity: 2);
        _dataBuilder.CreateLineItem(order, name: "Shipping line", lineItemType: LineItemType.Shipping, quantity: 1);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        CreateShipmentParameters? capturedParameters = null;
        var shipmentServiceMock = new Mock<IShipmentService>();
        shipmentServiceMock
            .Setup(x => x.CreateShipmentAsync(It.IsAny<CreateShipmentParameters>(), It.IsAny<CancellationToken>()))
            .Callback<CreateShipmentParameters, CancellationToken>((parameters, _) => capturedParameters = parameters)
            .ReturnsAsync(new CrudResult<Shipment>
            {
                ResultObject = new Shipment { Id = Guid.NewGuid(), OrderId = order.Id }
            });

        var providerManagerMock = new Mock<IFulfilmentProviderManager>();
        providerManagerMock
            .Setup(x => x.GetConfiguredProviderAsync(config.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RegisteredFulfilmentProvider(CreateSupplierDirectProvider(), config));

        var handler = new FulfilmentAutoShipmentHandler(
            _fixture.GetService<IEFCoreScopeProvider<MerchelloDbContext>>(),
            shipmentServiceMock.Object,
            providerManagerMock.Object,
            NullLogger<FulfilmentAutoShipmentHandler>.Instance);

        await handler.HandleAsync(new FulfilmentSubmittedNotification(order, config), CancellationToken.None);

        shipmentServiceMock.Verify(
            x => x.CreateShipmentAsync(It.IsAny<CreateShipmentParameters>(), It.IsAny<CancellationToken>()),
            Times.Once);
        capturedParameters.ShouldNotBeNull();
        capturedParameters!.OrderId.ShouldBe(order.Id);
        capturedParameters.LineItems.Count.ShouldBe(1);
        capturedParameters.LineItems.Values.Single().ShouldBe(2);
    }

    [Fact]
    public async Task HandleAsync_WhenShipmentAlreadyExists_DoesNotCreateAnotherShipment()
    {
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration(
            providerKey: SupplierDirectProviderDefaults.ProviderKey,
            displayName: "Supplier Direct");
        var warehouse = _dataBuilder.CreateWarehouse();
        var shippingOption = _dataBuilder.CreateShippingOption(warehouse: warehouse);
        var invoice = _dataBuilder.CreateInvoice();
        var order = _dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Processing);
        _dataBuilder.CreateLineItem(order, name: "Product line", lineItemType: LineItemType.Product, quantity: 1);
        _dataBuilder.CreateShipment(order, warehouse);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var shipmentServiceMock = new Mock<IShipmentService>();
        var providerManagerMock = new Mock<IFulfilmentProviderManager>();
        providerManagerMock
            .Setup(x => x.GetConfiguredProviderAsync(config.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RegisteredFulfilmentProvider(CreateSupplierDirectProvider(), config));

        var handler = new FulfilmentAutoShipmentHandler(
            _fixture.GetService<IEFCoreScopeProvider<MerchelloDbContext>>(),
            shipmentServiceMock.Object,
            providerManagerMock.Object,
            NullLogger<FulfilmentAutoShipmentHandler>.Instance);

        await handler.HandleAsync(new FulfilmentSubmittedNotification(order, config), CancellationToken.None);

        shipmentServiceMock.Verify(
            x => x.CreateShipmentAsync(It.IsAny<CreateShipmentParameters>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_WhenProviderDoesNotCreateShipments_DoesNothing()
    {
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration(
            providerKey: "test-fulfilment",
            displayName: "Test Provider");
        var warehouse = _dataBuilder.CreateWarehouse();
        var shippingOption = _dataBuilder.CreateShippingOption(warehouse: warehouse);
        var invoice = _dataBuilder.CreateInvoice();
        var order = _dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Processing);
        _dataBuilder.CreateLineItem(order, name: "Product line", lineItemType: LineItemType.Product, quantity: 1);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var shipmentServiceMock = new Mock<IShipmentService>();
        var providerManagerMock = new Mock<IFulfilmentProviderManager>();
        providerManagerMock
            .Setup(x => x.GetConfiguredProviderAsync(config.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RegisteredFulfilmentProvider(new TestFulfilmentProvider(), config));

        var handler = new FulfilmentAutoShipmentHandler(
            _fixture.GetService<IEFCoreScopeProvider<MerchelloDbContext>>(),
            shipmentServiceMock.Object,
            providerManagerMock.Object,
            NullLogger<FulfilmentAutoShipmentHandler>.Instance);

        await handler.HandleAsync(new FulfilmentSubmittedNotification(order, config), CancellationToken.None);

        shipmentServiceMock.Verify(
            x => x.CreateShipmentAsync(It.IsAny<CreateShipmentParameters>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    private static SupplierDirectFulfilmentProvider CreateSupplierDirectProvider()
    {
        return new SupplierDirectFulfilmentProvider(
            Mock.Of<IEmailConfigurationService>(),
            Mock.Of<IEmailService>(),
            Mock.Of<IFtpClientFactory>(),
            new SupplierDirectCsvGenerator(),
            NullLogger<SupplierDirectFulfilmentProvider>.Instance);
    }
}
