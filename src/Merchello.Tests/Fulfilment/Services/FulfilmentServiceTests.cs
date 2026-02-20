using Merchello.Core.Accounting.Models;
using Merchello.Core.Data;
using Merchello.Core.Fulfilment;
using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Fulfilment.Providers;
using Merchello.Core.Fulfilment.Providers.SupplierDirect;
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
using Umbraco.Cms.Persistence.EFCore.Scoping;
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
        result.Success.ShouldBeFalse();
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
        result.Success.ShouldBeTrue();
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
        result.Success.ShouldBeTrue();

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
        result.Success.ShouldBeFalse();
        result.Messages.ErrorMessages().Select(m => m.Message!).ShouldContain(m => m.Contains("Connection timeout"));

        var updatedOrder = await _fixture.DbContext.Orders.FindAsync(order.Id);
        updatedOrder!.FulfilmentRetryCount.ShouldBe(1);
        updatedOrder.FulfilmentErrorMessage!.ShouldContain("Connection timeout");
        updatedOrder.FulfilmentProviderReference.ShouldBeNullOrEmpty();
    }

    [Fact]
    public async Task SubmitOrderAsync_ProcessingOrderWithPreviousFailure_AllowsRetryAttempt()
    {
        // Arrange
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration();
        var warehouse = _dataBuilder.CreateWarehouse();
        _dataBuilder.AssignFulfilmentProviderToWarehouse(warehouse, config);
        var shippingOption = _dataBuilder.CreateShippingOption(warehouse: warehouse);
        var invoice = _dataBuilder.CreateInvoice();
        var order = _dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Processing);
        order.FulfilmentProviderConfigurationId = config.Id;
        order.FulfilmentErrorMessage = "Previous timeout";
        order.FulfilmentRetryCount = 1;
        _dataBuilder.CreateLineItem(order, name: "Retry Product", amount: 10.00m);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateFulfilmentServiceWithProvider(config);
        _testProvider.NextSubmitOrderResult = FulfilmentOrderResult.Succeeded("RETRY-REF-001");

        // Act
        var result = await service.SubmitOrderAsync(order.Id);

        // Assert
        result.Success.ShouldBeTrue();
        _testProvider.SubmittedOrders.Count.ShouldBe(1);

        var updatedOrder = await _fixture.DbContext.Orders.FindAsync(order.Id);
        updatedOrder.ShouldNotBeNull();
        updatedOrder!.FulfilmentProviderReference.ShouldBe("RETRY-REF-001");
        updatedOrder.FulfilmentErrorMessage.ShouldBeNull();
    }

    [Fact]
    public async Task SubmitOrderAsync_ProcessingOrderWithoutFailure_RemainsInProgress()
    {
        // Arrange
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration();
        var warehouse = _dataBuilder.CreateWarehouse();
        _dataBuilder.AssignFulfilmentProviderToWarehouse(warehouse, config);
        var shippingOption = _dataBuilder.CreateShippingOption(warehouse: warehouse);
        var invoice = _dataBuilder.CreateInvoice();
        var order = _dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Processing);
        order.FulfilmentProviderConfigurationId = config.Id;
        order.FulfilmentErrorMessage = null;
        order.FulfilmentRetryCount = 0;
        _dataBuilder.CreateLineItem(order, name: "In Progress Product", amount: 10.00m);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateFulfilmentServiceWithProvider(config);
        _testProvider.NextSubmitOrderResult = FulfilmentOrderResult.Succeeded("SHOULD-NOT-SUBMIT");

        // Act
        var result = await service.SubmitOrderAsync(order.Id);

        // Assert
        result.Success.ShouldBeTrue();
        result.Messages.WarningMessages().Select(m => m.Message!).ShouldContain(m => m.Contains("already in progress"));
        _testProvider.SubmittedOrders.Count.ShouldBe(0);
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
    public async Task SubmitOrderAsync_NonRetryableErrorCode_FailsImmediately()
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
        _testProvider.NextSubmitOrderResult = FulfilmentOrderResult.Failed(
            "Supplier host is missing",
            ErrorClassification.ConfigurationError.ToString());

        // Act
        var result = await service.SubmitOrderAsync(order.Id);

        // Assert
        result.Success.ShouldBeFalse();

        var updatedOrder = await _fixture.DbContext.Orders.FindAsync(order.Id);
        updatedOrder.ShouldNotBeNull();
        updatedOrder!.Status.ShouldBe(OrderStatus.FulfilmentFailed);
        updatedOrder.FulfilmentRetryCount.ShouldBe(5);
        updatedOrder.ExtendedData["Fulfilment:ErrorCode"].ToString().ShouldBe(ErrorClassification.ConfigurationError.ToString());
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
        result.Success.ShouldBeFalse();
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
        result.Success.ShouldBeFalse();
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
        result.Success.ShouldBeTrue();

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
        result.Success.ShouldBeTrue();
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
        result.Success.ShouldBeTrue();
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
        result.Success.ShouldBeTrue();

        var updatedOrder = await _fixture.DbContext.Orders.FindAsync(order.Id);
        updatedOrder!.Status.ShouldBe(OrderStatus.Shipped);
        updatedOrder.ShippedDate.ShouldNotBeNull();
        updatedOrder.ExtendedData["Fulfilment:ProviderStatus"].ToString().ShouldBe("SHIPPED");
    }

    [Fact]
    public async Task ProcessStatusUpdateAsync_GuidProviderReference_FallsBackToOrderId()
    {
        // Arrange
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration();
        var order = _dataBuilder.CreateSubmittedFulfilmentOrder(providerConfig: config, providerReference: "SHIPBOB-ORDER-123");
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateFulfilmentService();
        var statusUpdate = new FulfilmentStatusUpdate
        {
            ProviderReference = order.Id.ToString(),
            ProviderStatus = "DELIVERED",
            MappedStatus = OrderStatus.Completed,
            StatusDate = DateTime.UtcNow
        };

        // Act
        var result = await service.ProcessStatusUpdateAsync(statusUpdate);

        // Assert
        result.Success.ShouldBeTrue();

        var updatedOrder = await _fixture.DbContext.Orders.FindAsync(order.Id);
        updatedOrder.ShouldNotBeNull();
        updatedOrder.Status.ShouldBe(OrderStatus.Completed);
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
        result.Success.ShouldBeFalse();
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
        result.Success.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject!.TrackingNumber.ShouldBe("TRACK-123456");
        result.ResultObject.Carrier.ShouldBe("Test Carrier");
    }

    [Fact]
    public async Task ProcessShipmentUpdateAsync_GuidProviderReference_FallsBackToOrderId()
    {
        // Arrange
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration();
        var warehouse = _dataBuilder.CreateWarehouse();
        _dataBuilder.AssignFulfilmentProviderToWarehouse(warehouse, config);
        var shippingOption = _dataBuilder.CreateShippingOption(warehouse: warehouse);
        var invoice = _dataBuilder.CreateInvoice();
        var order = _dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Processing);
        order.FulfilmentProviderConfigurationId = config.Id;
        order.FulfilmentProviderReference = "SHIPBOB-ORDER-456";
        _dataBuilder.CreateLineItem(order, name: "Test Product", amount: 25.00m);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateFulfilmentService();
        var shipmentUpdate = new FulfilmentShipmentUpdate
        {
            ProviderReference = order.Id.ToString(),
            ProviderShipmentId = "SHIP-GUID-FALLBACK",
            TrackingNumber = "TRACK-GUID-123",
            Carrier = "Fallback Carrier",
            ShippedDate = DateTime.UtcNow
        };

        // Act
        var result = await service.ProcessShipmentUpdateAsync(shipmentUpdate);

        // Assert
        result.Success.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject!.TrackingNumber.ShouldBe("TRACK-GUID-123");
        result.ResultObject.Carrier.ShouldBe("Fallback Carrier");
    }

    [Fact]
    public async Task ProcessShipmentUpdateAsync_PartialShipments_UseQuantityShippedAndRemainPartial()
    {
        // Arrange
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration();
        var warehouse = _dataBuilder.CreateWarehouse();
        _dataBuilder.AssignFulfilmentProviderToWarehouse(warehouse, config);
        var shippingOption = _dataBuilder.CreateShippingOption(warehouse: warehouse);
        var invoice = _dataBuilder.CreateInvoice();
        var order = _dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Processing);
        order.FulfilmentProviderConfigurationId = config.Id;
        order.FulfilmentProviderReference = "PARTIAL-SHIP-REF";
        if (order.LineItems != null)
        {
            foreach (var existingLineItem in order.LineItems.ToList())
            {
                _fixture.DbContext.LineItems.Remove(existingLineItem);
            }
            order.LineItems.Clear();
        }

        var productA = _dataBuilder.CreateProduct("Product A");
        productA.Sku = "SKU-A";
        _dataBuilder.CreateProductWarehouse(productA, warehouse, stock: 10);

        var productB = _dataBuilder.CreateProduct("Product B");
        productB.Sku = "SKU-B";
        _dataBuilder.CreateProductWarehouse(productB, warehouse, stock: 10);

        _dataBuilder.CreateLineItem(order, product: productA, quantity: 2, amount: 10.00m);
        _dataBuilder.CreateLineItem(order, product: productB, quantity: 1, amount: 15.00m);
        _dataBuilder.CreateOrderLevelDiscount(order, discountAmount: 5.00m);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateFulfilmentService();

        // Act - first partial shipment (1 out of 2 for SKU-A)
        var firstResult = await service.ProcessShipmentUpdateAsync(new FulfilmentShipmentUpdate
        {
            ProviderReference = "PARTIAL-SHIP-REF",
            ProviderShipmentId = "SHIP-001",
            TrackingNumber = "TRACK-001",
            Carrier = "Carrier One",
            ShippedDate = DateTime.UtcNow,
            Items =
            [
                new FulfilmentShippedItem { Sku = "SKU-A", QuantityShipped = 1 }
            ]
        });

        // Assert first shipment
        firstResult.Success.ShouldBeTrue();
        var afterFirst = await _fixture.DbContext.Orders
            .Include(o => o.Shipments)
            .FirstAsync(o => o.Id == order.Id);
        afterFirst.Status.ShouldBe(OrderStatus.PartiallyShipped);
        var firstShipment = afterFirst.Shipments.ShouldNotBeNull().Single();
        firstShipment.LineItems.Sum(li => li.Quantity).ShouldBe(1);

        // Act - second shipment progresses remaining known SKU quantities
        var secondResult = await service.ProcessShipmentUpdateAsync(new FulfilmentShipmentUpdate
        {
            ProviderReference = "PARTIAL-SHIP-REF",
            ProviderShipmentId = "SHIP-002",
            TrackingNumber = "TRACK-002",
            Carrier = "Carrier Two",
            ShippedDate = DateTime.UtcNow,
            Items =
            [
                new FulfilmentShippedItem { Sku = "SKU-A", QuantityShipped = 1 },
                new FulfilmentShippedItem { Sku = "SKU-B", QuantityShipped = 1 }
            ]
        });

        // Assert second shipment remains partial until complete quantity is fulfilled
        secondResult.Success.ShouldBeTrue();
        var afterSecond = await _fixture.DbContext.Orders
            .Include(o => o.Shipments)
            .FirstAsync(o => o.Id == order.Id);
        afterSecond.Status.ShouldBe(OrderStatus.PartiallyShipped);
        afterSecond.Shipments.ShouldNotBeNull().Count.ShouldBe(2);
    }

    [Fact]
    public async Task ProcessShipmentUpdateAsync_FullShipment_ExcludesDiscountLineItems()
    {
        // Arrange
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration();
        var warehouse = _dataBuilder.CreateWarehouse();
        _dataBuilder.AssignFulfilmentProviderToWarehouse(warehouse, config);
        var shippingOption = _dataBuilder.CreateShippingOption(warehouse: warehouse);
        var invoice = _dataBuilder.CreateInvoice();
        var order = _dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Processing);
        order.FulfilmentProviderConfigurationId = config.Id;
        order.FulfilmentProviderReference = "FULL-SHIP-REF";
        if (order.LineItems != null)
        {
            foreach (var existingLineItem in order.LineItems.ToList())
            {
                _fixture.DbContext.LineItems.Remove(existingLineItem);
            }
            order.LineItems.Clear();
        }

        var product = _dataBuilder.CreateProduct("Shippable Product");
        product.Sku = "FULL-SKU";
        _dataBuilder.CreateProductWarehouse(product, warehouse, stock: 10);

        _dataBuilder.CreateLineItem(order, product: product, quantity: 1, amount: 20.00m);
        _dataBuilder.CreateOrderLevelDiscount(order, discountAmount: 5.00m);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateFulfilmentService();

        // Act
        var result = await service.ProcessShipmentUpdateAsync(new FulfilmentShipmentUpdate
        {
            ProviderReference = "FULL-SHIP-REF",
            ProviderShipmentId = "SHIP-FULL-001",
            TrackingNumber = "TRACK-FULL",
            Carrier = "Carrier",
            ShippedDate = DateTime.UtcNow
        });

        // Assert
        result.Success.ShouldBeTrue();
        var updatedOrder = await _fixture.DbContext.Orders
            .Include(o => o.Shipments)
            .FirstAsync(o => o.Id == order.Id);
        updatedOrder.Status.ShouldBe(OrderStatus.Shipped);
        var shipment = updatedOrder.Shipments.ShouldNotBeNull().Single();
        shipment.LineItems.ShouldAllBe(li => li.LineItemType != LineItemType.Discount);
        shipment.LineItems.Count.ShouldBe(1);
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

    #region Webhook Idempotency Tests

    [Fact]
    public async Task TryLogWebhookAsync_SameProviderAndMessageId_IsIdempotent()
    {
        // Arrange
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration();
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();
        var service = CreateFulfilmentService();

        // Act
        var first = await service.TryLogWebhookAsync(config.Id, "msg-001", "shipment.created", "{}");
        var second = await service.TryLogWebhookAsync(config.Id, "msg-001", "shipment.created", "{}");

        // Assert
        first.ShouldBeTrue();
        second.ShouldBeFalse();

        var count = await _fixture.DbContext.FulfilmentWebhookLogs
            .CountAsync(x => x.ProviderConfigurationId == config.Id && x.MessageId == "msg-001");
        count.ShouldBe(1);
    }

    [Fact]
    public async Task TryLogWebhookAsync_SameMessageIdAcrossProviders_IsNotDuplicate()
    {
        // Arrange
        var configA = _dataBuilder.CreateFulfilmentProviderConfiguration(providerKey: "provider-a");
        var configB = _dataBuilder.CreateFulfilmentProviderConfiguration(providerKey: "provider-b");
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();
        var service = CreateFulfilmentService();

        // Act
        var first = await service.TryLogWebhookAsync(configA.Id, "msg-shared", "shipment.created", "{}");
        var second = await service.TryLogWebhookAsync(configB.Id, "msg-shared", "shipment.created", "{}");

        // Assert
        first.ShouldBeTrue();
        second.ShouldBeTrue();

        var countA = await _fixture.DbContext.FulfilmentWebhookLogs
            .CountAsync(x => x.ProviderConfigurationId == configA.Id && x.MessageId == "msg-shared");
        var countB = await _fixture.DbContext.FulfilmentWebhookLogs
            .CountAsync(x => x.ProviderConfigurationId == configB.Id && x.MessageId == "msg-shared");
        countA.ShouldBe(1);
        countB.ShouldBe(1);
    }

    [Fact]
    public async Task TryLogWebhookAsync_ConcurrentDuplicateSubmissions_OnlyOneInsertSucceeds()
    {
        // Arrange
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration();
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();
        var service = CreateFulfilmentService();

        // Act
        var results = await Task.WhenAll(
            Enumerable.Range(0, 12)
                .Select(_ => service.TryLogWebhookAsync(config.Id, "msg-concurrent", "shipment.created", "{}")));

        // Assert
        results.Count(x => x).ShouldBe(1);

        var count = await _fixture.DbContext.FulfilmentWebhookLogs
            .CountAsync(x => x.ProviderConfigurationId == config.Id && x.MessageId == "msg-concurrent");
        count.ShouldBe(1);
    }

    [Fact]
    public async Task CompleteWebhookLogAsync_UpdatesEventTypeAfterSuccessfulProcessing()
    {
        // Arrange
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration();
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();
        var service = CreateFulfilmentService();

        // Act
        var inserted = await service.TryLogWebhookAsync(config.Id, "msg-complete", null, "{}");
        await service.CompleteWebhookLogAsync(
            config.Id,
            "msg-complete",
            "shipment.created",
            """{"topic":"shipment.created"}""");

        // Assert
        inserted.ShouldBeTrue();
        var log = await _fixture.DbContext.FulfilmentWebhookLogs
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ProviderConfigurationId == config.Id && x.MessageId == "msg-complete");

        log.ShouldNotBeNull();
        log.EventType.ShouldBe("shipment.created");
        log.Payload.ShouldBe("""{"topic":"shipment.created"}""");
    }

    [Fact]
    public async Task RemoveWebhookLogAsync_DeletesRowSoProviderRetriesAreNotBlocked()
    {
        // Arrange
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration();
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();
        var service = CreateFulfilmentService();

        // Act
        var inserted = await service.TryLogWebhookAsync(config.Id, "msg-retry", null, "{}");
        await service.RemoveWebhookLogAsync(config.Id, "msg-retry");
        var duplicate = await service.IsDuplicateWebhookAsync(config.Id, "msg-retry");

        // Assert
        inserted.ShouldBeTrue();
        duplicate.ShouldBeFalse();
        var count = await _fixture.DbContext.FulfilmentWebhookLogs
            .CountAsync(x => x.ProviderConfigurationId == config.Id && x.MessageId == "msg-retry");
        count.ShouldBe(0);
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
            _fixture.GetService<IEFCoreScopeProvider<MerchelloDbContext>>(),
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
            _fixture.GetService<IEFCoreScopeProvider<MerchelloDbContext>>(),
            providerManagerMock.Object,
            new ShipmentFactory(),
            Options.Create(new FulfilmentSettings { MaxRetryAttempts = 5 }),
            NullLogger<FulfilmentService>.Instance);
    }

    #endregion
}
