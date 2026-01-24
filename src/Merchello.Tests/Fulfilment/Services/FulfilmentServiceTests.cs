using Merchello.Core.Accounting.Models;
using Merchello.Core.Fulfilment;
using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Fulfilment.Providers;
using Merchello.Core.Fulfilment.Providers.Interfaces;
using Merchello.Core.Fulfilment.Services;
using Merchello.Core.Fulfilment.Services.Interfaces;
using Merchello.Core.Shipping.Factories;
using Merchello.Core.Shared.Extensions;
using Merchello.Tests.Fulfilment.Providers;
using Merchello.Tests.TestInfrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Fulfilment.Services;

/// <summary>
/// Integration tests for FulfilmentService.
/// Tests order submission, retry logic, status updates, and shipment updates.
/// </summary>
[Collection("Integration Tests")]
public class FulfilmentServiceTests
{
    private readonly ServiceTestFixture _fixture;
    private readonly TestDataBuilder _dataBuilder;
    private readonly TestFulfilmentProvider _testProvider;

    public FulfilmentServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _dataBuilder = _fixture.CreateDataBuilder();
        _testProvider = new TestFulfilmentProvider();
    }

    #region SubmitOrderAsync Tests

    [Fact]
    public async Task SubmitOrderAsync_OrderNotFound_ReturnsError()
    {
        // Arrange
        var service = CreateFulfilmentService();

        // Act
        var result = await service.SubmitOrderAsync(Guid.NewGuid());

        // Assert
        result.Successful.ShouldBeFalse();
        result.Messages.ErrorMessages().Select(m => m.Message!).ShouldContain(m => m.Contains("not found"));
    }

    [Fact]
    public async Task SubmitOrderAsync_OrderAlreadySubmitted_ReturnsWarning()
    {
        // Arrange
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration();
        var order = _dataBuilder.CreateSubmittedFulfilmentOrder(providerConfig: config, providerReference: "EXISTING-REF");
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateFulfilmentService();

        // Act
        var result = await service.SubmitOrderAsync(order.Id);

        // Assert
        result.Messages.WarningMessages().Any().ShouldBeTrue();
        result.Messages.WarningMessages().Select(m => m.Message!).ShouldContain(m => m.Contains("already been submitted"));
    }

    [Fact]
    public async Task SubmitOrderAsync_NoProviderConfigured_ReturnsSuccessForManualFulfilment()
    {
        // Arrange - Create order without fulfilment provider
        var warehouse = _dataBuilder.CreateWarehouse();
        var shippingOption = _dataBuilder.CreateShippingOption(warehouse: warehouse);
        var invoice = _dataBuilder.CreateInvoice();
        var order = _dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Pending);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateFulfilmentService();

        // Act
        var result = await service.SubmitOrderAsync(order.Id);

        // Assert - No error, manual fulfilment is assumed
        result.Successful.ShouldBeTrue();
    }

    [Fact]
    public async Task SubmitOrderAsync_ProviderSucceeds_UpdatesOrderWithReference()
    {
        // Arrange
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration();
        var warehouse = _dataBuilder.CreateWarehouse();
        _dataBuilder.AssignFulfilmentProviderToWarehouse(warehouse, config);
        var shippingOption = _dataBuilder.CreateShippingOption(warehouse: warehouse);
        var invoice = _dataBuilder.CreateInvoice();
        var order = _dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Pending);
        _dataBuilder.CreateLineItem(order, name: "Test Product", amount: 25.00m);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateFulfilmentServiceWithProvider(config);
        _testProvider.NextSubmitOrderResult = FulfilmentOrderResult.Succeeded("PROVIDER-REF-123");

        // Act
        var result = await service.SubmitOrderAsync(order.Id);

        // Assert
        result.Successful.ShouldBeTrue();

        var updatedOrder = await _fixture.DbContext.Orders.FindAsync(order.Id);
        updatedOrder!.FulfilmentProviderReference.ShouldBe("PROVIDER-REF-123");
        updatedOrder.FulfilmentProviderConfigurationId.ShouldBe(config.Id);
        updatedOrder.FulfilmentSubmittedAt.ShouldNotBeNull();
        updatedOrder.Status.ShouldBe(OrderStatus.Processing);
    }

    [Fact]
    public async Task SubmitOrderAsync_ProviderFails_IncrementsRetryCount()
    {
        // Arrange
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration();
        var warehouse = _dataBuilder.CreateWarehouse();
        _dataBuilder.AssignFulfilmentProviderToWarehouse(warehouse, config);
        var shippingOption = _dataBuilder.CreateShippingOption(warehouse: warehouse);
        var invoice = _dataBuilder.CreateInvoice();
        var order = _dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Pending);
        _dataBuilder.CreateLineItem(order, name: "Test Product", amount: 25.00m);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateFulfilmentServiceWithProvider(config);
        _testProvider.NextSubmitOrderResult = FulfilmentOrderResult.Failed("API error: Connection timeout");

        // Act
        var result = await service.SubmitOrderAsync(order.Id);

        // Assert
        result.Successful.ShouldBeFalse();
        result.Messages.ErrorMessages().Select(m => m.Message!).ShouldContain(m => m.Contains("Connection timeout"));

        var updatedOrder = await _fixture.DbContext.Orders.FindAsync(order.Id);
        updatedOrder!.FulfilmentRetryCount.ShouldBe(1);
        updatedOrder.FulfilmentErrorMessage!.ShouldContain("Connection timeout");
        updatedOrder.FulfilmentProviderReference.ShouldBeNullOrEmpty();
    }

    [Fact]
    public async Task SubmitOrderAsync_ExceedsMaxRetries_SetsStatusToFulfilmentFailed()
    {
        // Arrange
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration();
        var warehouse = _dataBuilder.CreateWarehouse();
        _dataBuilder.AssignFulfilmentProviderToWarehouse(warehouse, config);
        var shippingOption = _dataBuilder.CreateShippingOption(warehouse: warehouse);
        var invoice = _dataBuilder.CreateInvoice();
        // Use Pending status to avoid the "already in progress" guard
        var order = _dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Pending);
        order.FulfilmentRetryCount = 4; // Already at 4 retries (max is 5)
        // Don't set FulfilmentProviderConfigurationId - let it be resolved from warehouse
        _dataBuilder.CreateLineItem(order, name: "Test Product", amount: 25.00m);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateFulfilmentServiceWithProvider(config);
        _testProvider.NextSubmitOrderResult = FulfilmentOrderResult.Failed("Persistent error");

        // Act
        var result = await service.SubmitOrderAsync(order.Id);

        // Assert
        var updatedOrder = await _fixture.DbContext.Orders.FindAsync(order.Id);
        updatedOrder!.FulfilmentRetryCount.ShouldBe(5);
        updatedOrder.Status.ShouldBe(OrderStatus.FulfilmentFailed);
    }

    [Fact]
    public async Task SubmitOrderAsync_ProviderThrowsException_HandledGracefully()
    {
        // Arrange
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration();
        var warehouse = _dataBuilder.CreateWarehouse();
        _dataBuilder.AssignFulfilmentProviderToWarehouse(warehouse, config);
        var shippingOption = _dataBuilder.CreateShippingOption(warehouse: warehouse);
        var invoice = _dataBuilder.CreateInvoice();
        var order = _dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Pending);
        _dataBuilder.CreateLineItem(order, name: "Test Product", amount: 25.00m);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateFulfilmentServiceWithProvider(config);
        _testProvider.ExceptionToThrow = new HttpRequestException("Network failure");

        // Act
        var result = await service.SubmitOrderAsync(order.Id);

        // Assert
        result.Successful.ShouldBeFalse();
        result.Messages.ErrorMessages().Select(m => m.Message!).ShouldContain(m => m.Contains("Network failure"));

        var updatedOrder = await _fixture.DbContext.Orders.FindAsync(order.Id);
        updatedOrder!.FulfilmentRetryCount.ShouldBe(1);
        updatedOrder.FulfilmentErrorMessage!.ShouldContain("Network failure");
    }

    #endregion

    #region RetrySubmissionAsync Tests

    [Fact]
    public async Task RetrySubmissionAsync_OrderNotInRetryableState_ReturnsError()
    {
        // Arrange
        var invoice = _dataBuilder.CreateInvoice();
        var warehouse = _dataBuilder.CreateWarehouse();
        var shippingOption = _dataBuilder.CreateShippingOption(warehouse: warehouse);
        var order = _dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Pending);
        // Order has no error message and is not FulfilmentFailed
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateFulfilmentService();

        // Act
        var result = await service.RetrySubmissionAsync(order.Id);

        // Assert
        result.Successful.ShouldBeFalse();
        result.Messages.ErrorMessages().Select(m => m.Message!).ShouldContain(m => m.Contains("not in a retryable state"));
    }

    [Fact]
    public async Task RetrySubmissionAsync_AlreadySubmitted_ReturnsWarning()
    {
        // Arrange
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration();
        var order = _dataBuilder.CreateSubmittedFulfilmentOrder(providerConfig: config);
        order.FulfilmentErrorMessage = "Previous error"; // Has error but also has reference
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateFulfilmentService();

        // Act
        var result = await service.RetrySubmissionAsync(order.Id);

        // Assert
        result.Messages.WarningMessages().Any().ShouldBeTrue();
        result.Messages.WarningMessages().Select(m => m.Message!).ShouldContain(m => m.Contains("already been submitted"));
    }

    [Fact]
    public async Task RetrySubmissionAsync_FailedOrder_ResetsAndResubmits()
    {
        // Arrange
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration();
        var warehouse = _dataBuilder.CreateWarehouse();
        _dataBuilder.AssignFulfilmentProviderToWarehouse(warehouse, config);
        var shippingOption = _dataBuilder.CreateShippingOption(warehouse: warehouse);
        var invoice = _dataBuilder.CreateInvoice();
        var order = _dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.FulfilmentFailed);
        // Don't set FulfilmentProviderConfigurationId directly - let it be resolved from warehouse
        // This simulates an order that failed before the provider config was linked to the order
        order.FulfilmentErrorMessage = "Previous API failure";
        order.FulfilmentRetryCount = 3;
        _dataBuilder.CreateLineItem(order, name: "Test Product", amount: 25.00m);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateFulfilmentServiceWithProvider(config);
        _testProvider.NextSubmitOrderResult = FulfilmentOrderResult.Succeeded("RETRY-SUCCESS-REF");

        // Act
        var result = await service.RetrySubmissionAsync(order.Id);

        // Assert
        result.Successful.ShouldBeTrue();

        var updatedOrder = await _fixture.DbContext.Orders.FindAsync(order.Id);
        updatedOrder!.FulfilmentProviderReference.ShouldBe("RETRY-SUCCESS-REF");
        updatedOrder.FulfilmentErrorMessage.ShouldBeNull();
    }

    #endregion

    #region CancelOrderAsync Tests

    [Fact]
    public async Task CancelOrderAsync_NoProviderReference_ReturnsSuccessWithoutCallingProvider()
    {
        // Arrange
        var invoice = _dataBuilder.CreateInvoice();
        var warehouse = _dataBuilder.CreateWarehouse();
        var shippingOption = _dataBuilder.CreateShippingOption(warehouse: warehouse);
        var order = _dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Pending);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateFulfilmentService();

        // Act
        var result = await service.CancelOrderAsync(order.Id);

        // Assert
        result.Successful.ShouldBeTrue();
        _testProvider.CancelledReferences.ShouldBeEmpty();
    }

    [Fact]
    public async Task CancelOrderAsync_WithProviderReference_CallsProviderCancel()
    {
        // Arrange
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration();
        var order = _dataBuilder.CreateSubmittedFulfilmentOrder(providerConfig: config, providerReference: "CANCEL-ME-123");
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateFulfilmentServiceWithProvider(config);
        _testProvider.NextCancelResult = FulfilmentCancelResult.Succeeded();

        // Act
        var result = await service.CancelOrderAsync(order.Id);

        // Assert
        result.Successful.ShouldBeTrue();
        _testProvider.CancelledReferences.ShouldContain("CANCEL-ME-123");
    }

    #endregion

    #region ProcessStatusUpdateAsync Tests

    [Fact]
    public async Task ProcessStatusUpdateAsync_UpdatesOrderStatus()
    {
        // Arrange
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration();
        var order = _dataBuilder.CreateSubmittedFulfilmentOrder(providerConfig: config, providerReference: "STATUS-UPDATE-REF");
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateFulfilmentService();
        var statusUpdate = new FulfilmentStatusUpdate
        {
            ProviderReference = "STATUS-UPDATE-REF",
            ProviderStatus = "SHIPPED",
            MappedStatus = OrderStatus.Shipped,
            StatusDate = DateTime.UtcNow
        };

        // Act
        var result = await service.ProcessStatusUpdateAsync(statusUpdate);

        // Assert
        result.Successful.ShouldBeTrue();

        var updatedOrder = await _fixture.DbContext.Orders.FindAsync(order.Id);
        updatedOrder!.Status.ShouldBe(OrderStatus.Shipped);
        updatedOrder.ShippedDate.ShouldNotBeNull();
        updatedOrder.ExtendedData["Fulfilment:ProviderStatus"].ShouldBe("SHIPPED");
    }

    [Fact]
    public async Task ProcessStatusUpdateAsync_OrderNotFound_ReturnsError()
    {
        // Arrange
        var service = CreateFulfilmentService();
        var statusUpdate = new FulfilmentStatusUpdate
        {
            ProviderReference = "NON-EXISTENT-REF",
            ProviderStatus = "SHIPPED",
            MappedStatus = OrderStatus.Shipped,
            StatusDate = DateTime.UtcNow
        };

        // Act
        var result = await service.ProcessStatusUpdateAsync(statusUpdate);

        // Assert
        result.Successful.ShouldBeFalse();
        result.Messages.ErrorMessages().Select(m => m.Message!).ShouldContain(m => m.Contains("not found"));
    }

    #endregion

    #region ProcessShipmentUpdateAsync Tests

    [Fact]
    public async Task ProcessShipmentUpdateAsync_CreatesNewShipment()
    {
        // Arrange
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration();
        var warehouse = _dataBuilder.CreateWarehouse();
        _dataBuilder.AssignFulfilmentProviderToWarehouse(warehouse, config);
        var shippingOption = _dataBuilder.CreateShippingOption(warehouse: warehouse);
        var invoice = _dataBuilder.CreateInvoice();
        var order = _dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Processing);
        order.FulfilmentProviderConfigurationId = config.Id;
        order.FulfilmentProviderReference = "SHIPMENT-REF";
        _dataBuilder.CreateLineItem(order, name: "Test Product", amount: 25.00m);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateFulfilmentService();
        var shipmentUpdate = new FulfilmentShipmentUpdate
        {
            ProviderReference = "SHIPMENT-REF",
            ProviderShipmentId = "SHIP-001",
            TrackingNumber = "TRACK-123456",
            Carrier = "Test Carrier",
            ShippedDate = DateTime.UtcNow
        };

        // Act
        var result = await service.ProcessShipmentUpdateAsync(shipmentUpdate);

        // Assert
        result.Successful.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject!.TrackingNumber.ShouldBe("TRACK-123456");
        result.ResultObject.Carrier.ShouldBe("Test Carrier");
    }

    #endregion

    #region GetOrdersForPollingAsync Tests

    [Fact]
    public async Task GetOrdersForPollingAsync_ReturnsOrdersWithProviderConfig()
    {
        // Arrange
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration();
        var order1 = _dataBuilder.CreateSubmittedFulfilmentOrder(providerConfig: config, providerReference: "REF-1");
        var order2 = _dataBuilder.CreateSubmittedFulfilmentOrder(providerConfig: config, providerReference: "REF-2");
        var order3 = _dataBuilder.CreateSubmittedFulfilmentOrder(providerConfig: config, providerReference: "REF-3");
        order3.Status = OrderStatus.Completed; // Should be excluded
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateFulfilmentService();

        // Act
        var result = await service.GetOrdersForPollingAsync(config.Id);

        // Assert
        result.Count.ShouldBe(2);
        result.ShouldContain(o => o.FulfilmentProviderReference == "REF-1");
        result.ShouldContain(o => o.FulfilmentProviderReference == "REF-2");
        result.ShouldNotContain(o => o.FulfilmentProviderReference == "REF-3");
    }

    #endregion

    #region Helper Methods

    private IFulfilmentService CreateFulfilmentService()
    {
        var providerManagerMock = new Mock<IFulfilmentProviderManager>();
        providerManagerMock
            .Setup(x => x.GetConfiguredProviderAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((RegisteredFulfilmentProvider?)null);

        return new FulfilmentService(
            _fixture.DbContext,
            providerManagerMock.Object,
            new ShipmentFactory(),
            Options.Create(new FulfilmentSettings { MaxRetryAttempts = 5 }),
            NullLogger<FulfilmentService>.Instance);
    }

    private IFulfilmentService CreateFulfilmentServiceWithProvider(FulfilmentProviderConfiguration config)
    {
        _testProvider.Reset();

        var registeredProvider = new RegisteredFulfilmentProvider(_testProvider, config);

        var providerManagerMock = new Mock<IFulfilmentProviderManager>();
        providerManagerMock
            .Setup(x => x.GetConfiguredProviderAsync(config.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(registeredProvider);

        return new FulfilmentService(
            _fixture.DbContext,
            providerManagerMock.Object,
            new ShipmentFactory(),
            Options.Create(new FulfilmentSettings { MaxRetryAttempts = 5 }),
            NullLogger<FulfilmentService>.Instance);
    }

    #endregion
}
