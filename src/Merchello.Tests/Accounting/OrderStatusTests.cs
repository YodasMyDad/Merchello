using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Handlers;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Locality.Factories;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Warehouses.Factories;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Accounting;

/// <summary>
/// Tests for the DefaultOrderStatusHandler order state machine.
/// Validates transition rules and date field updates during status changes.
/// </summary>
public class OrderStatusTests
{
    private readonly DefaultOrderStatusHandler _statusHandler;
    private readonly Mock<ILogger<DefaultOrderStatusHandler>> _loggerMock;
    private readonly ICurrencyService _currencyService;
    private readonly InvoiceFactory _invoiceFactory;
    private readonly OrderFactory _orderFactory = new();
    private readonly WarehouseFactory _warehouseFactory = new();
    private readonly AddressFactory _addressFactory = new();

    public OrderStatusTests()
    {
        _loggerMock = new Mock<ILogger<DefaultOrderStatusHandler>>();
        _statusHandler = new DefaultOrderStatusHandler(_loggerMock.Object);
        var settings = Options.Create(new MerchelloSettings
        {
            DefaultRounding = MidpointRounding.AwayFromZero,
            StoreCurrencyCode = "USD"
        });
        _currencyService = new CurrencyService(settings);
        _invoiceFactory = new InvoiceFactory(_currencyService);
    }

    #region Valid Transition Tests

    [Fact]
    public async Task CanTransition_FromPendingToReadyToFulfill_ReturnsTrue()
    {
        // Arrange
        var order = CreateOrder(OrderStatus.Pending);

        // Act
        var canTransition = await _statusHandler.CanTransitionAsync(order, OrderStatus.ReadyToFulfill);

        // Assert
        canTransition.ShouldBeTrue();
    }

    [Fact]
    public async Task CanTransition_FromPendingToProcessing_ReturnsTrue()
    {
        // Arrange
        var order = CreateOrder(OrderStatus.Pending);

        // Act
        var canTransition = await _statusHandler.CanTransitionAsync(order, OrderStatus.Processing);

        // Assert
        canTransition.ShouldBeTrue();
    }

    [Fact]
    public async Task CanTransition_FromReadyToFulfillToProcessing_ReturnsTrue()
    {
        // Arrange
        var order = CreateOrder(OrderStatus.ReadyToFulfill);

        // Act
        var canTransition = await _statusHandler.CanTransitionAsync(order, OrderStatus.Processing);

        // Assert
        canTransition.ShouldBeTrue();
    }

    [Fact]
    public async Task CanTransition_FromProcessingToShipped_ReturnsTrue()
    {
        // Arrange
        var order = CreateOrder(OrderStatus.Processing);

        // Act
        var canTransition = await _statusHandler.CanTransitionAsync(order, OrderStatus.Shipped);

        // Assert
        canTransition.ShouldBeTrue();
    }

    [Fact]
    public async Task CanTransition_FromShippedToCompleted_ReturnsTrue()
    {
        // Arrange
        var order = CreateOrder(OrderStatus.Shipped);

        // Act
        var canTransition = await _statusHandler.CanTransitionAsync(order, OrderStatus.Completed);

        // Assert
        canTransition.ShouldBeTrue();
    }

    [Fact]
    public async Task CanTransition_SameStatus_ReturnsTrue()
    {
        // Arrange
        var order = CreateOrder(OrderStatus.Processing);

        // Act
        var canTransition = await _statusHandler.CanTransitionAsync(order, OrderStatus.Processing);

        // Assert
        canTransition.ShouldBeTrue();
    }

    #endregion

    #region Terminal State Tests

    [Fact]
    public async Task CanTransition_FromCancelledToAnyStatus_ReturnsFalse()
    {
        // Arrange
        var order = CreateOrder(OrderStatus.Cancelled);

        // Act & Assert
        (await _statusHandler.CanTransitionAsync(order, OrderStatus.Pending)).ShouldBeFalse();
        (await _statusHandler.CanTransitionAsync(order, OrderStatus.ReadyToFulfill)).ShouldBeFalse();
        (await _statusHandler.CanTransitionAsync(order, OrderStatus.Processing)).ShouldBeFalse();
        (await _statusHandler.CanTransitionAsync(order, OrderStatus.Shipped)).ShouldBeFalse();
        (await _statusHandler.CanTransitionAsync(order, OrderStatus.Completed)).ShouldBeFalse();
    }

    [Fact]
    public async Task CanTransition_FromCompletedToShipped_ReturnsTrue()
    {
        // Arrange - Completed orders can revert to Shipped (if delivery status changes)
        var order = CreateOrder(OrderStatus.Completed);

        // Act & Assert
        (await _statusHandler.CanTransitionAsync(order, OrderStatus.Shipped)).ShouldBeTrue();
    }

    [Fact]
    public async Task CanTransition_FromCompletedToOtherStatuses_ReturnsFalse()
    {
        // Arrange
        var order = CreateOrder(OrderStatus.Completed);

        // Act & Assert - Can only revert to Shipped, not other statuses
        (await _statusHandler.CanTransitionAsync(order, OrderStatus.Pending)).ShouldBeFalse();
        (await _statusHandler.CanTransitionAsync(order, OrderStatus.ReadyToFulfill)).ShouldBeFalse();
        (await _statusHandler.CanTransitionAsync(order, OrderStatus.Processing)).ShouldBeFalse();
        (await _statusHandler.CanTransitionAsync(order, OrderStatus.Cancelled)).ShouldBeFalse();
    }

    #endregion

    #region Cancel Prevention Tests

    [Fact]
    public async Task CanTransition_FromShippedToCancelled_ReturnsFalse()
    {
        // Arrange
        var order = CreateOrder(OrderStatus.Shipped);

        // Act
        var canTransition = await _statusHandler.CanTransitionAsync(order, OrderStatus.Cancelled);

        // Assert
        canTransition.ShouldBeFalse();
    }

    [Fact]
    public async Task CanTransition_FromPartiallyShippedToCancelled_ReturnsFalse()
    {
        // Arrange
        var order = CreateOrder(OrderStatus.PartiallyShipped);

        // Act
        var canTransition = await _statusHandler.CanTransitionAsync(order, OrderStatus.Cancelled);

        // Assert
        canTransition.ShouldBeFalse();
    }

    [Fact]
    public async Task CanTransition_FromPendingToCancelled_ReturnsTrue()
    {
        // Arrange
        var order = CreateOrder(OrderStatus.Pending);

        // Act
        var canTransition = await _statusHandler.CanTransitionAsync(order, OrderStatus.Cancelled);

        // Assert
        canTransition.ShouldBeTrue();
    }

    [Fact]
    public async Task CanTransition_FromReadyToFulfillToCancelled_ReturnsTrue()
    {
        // Arrange
        var order = CreateOrder(OrderStatus.ReadyToFulfill);

        // Act
        var canTransition = await _statusHandler.CanTransitionAsync(order, OrderStatus.Cancelled);

        // Assert
        canTransition.ShouldBeTrue();
    }

    #endregion

    #region Backward Transition Prevention Tests

    [Fact]
    public async Task CanTransition_BackwardsInFulfillment_ReturnsFalse()
    {
        // Arrange
        var shippedOrder = CreateOrder(OrderStatus.Shipped);
        var processingOrder = CreateOrder(OrderStatus.Processing);

        // Act & Assert
        (await _statusHandler.CanTransitionAsync(shippedOrder, OrderStatus.Processing)).ShouldBeFalse();
        (await _statusHandler.CanTransitionAsync(shippedOrder, OrderStatus.ReadyToFulfill)).ShouldBeFalse();
        (await _statusHandler.CanTransitionAsync(processingOrder, OrderStatus.ReadyToFulfill)).ShouldBeFalse();
        (await _statusHandler.CanTransitionAsync(processingOrder, OrderStatus.Pending)).ShouldBeFalse();
    }

    [Fact]
    public async Task CanTransition_FromPendingToShipped_ReturnsFalse()
    {
        // Arrange - Can't skip processing step
        var order = CreateOrder(OrderStatus.Pending);

        // Act
        var canTransition = await _statusHandler.CanTransitionAsync(order, OrderStatus.Shipped);

        // Assert
        canTransition.ShouldBeFalse();
    }

    [Fact]
    public async Task CanTransition_FromAwaitingStockToShipped_ReturnsFalse()
    {
        // Arrange - Can't skip processing step
        var order = CreateOrder(OrderStatus.AwaitingStock);

        // Act
        var canTransition = await _statusHandler.CanTransitionAsync(order, OrderStatus.Shipped);

        // Assert
        canTransition.ShouldBeFalse();
    }

    [Fact]
    public async Task CanTransition_FromReadyToFulfillToShipped_ReturnsTrue()
    {
        // Arrange - Warehouse shipment completion can move ReadyToFulfill orders to Shipped
        var order = CreateOrder(OrderStatus.ReadyToFulfill);

        // Act
        var canTransition = await _statusHandler.CanTransitionAsync(order, OrderStatus.Shipped);

        // Assert
        canTransition.ShouldBeTrue();
    }

    #endregion

    #region Date Tracking Tests

    [Fact]
    public async Task OnStatusChanging_ToProcessing_SetsProcessingStartedDate()
    {
        // Arrange
        var order = CreateOrder(OrderStatus.ReadyToFulfill);
        order.ProcessingStartedDate.ShouldBeNull();

        // Act
        await _statusHandler.OnStatusChangingAsync(order, OrderStatus.ReadyToFulfill, OrderStatus.Processing);

        // Assert
        order.ProcessingStartedDate.ShouldNotBeNull();
        order.ProcessingStartedDate.Value.ShouldBeGreaterThan(DateTime.UtcNow.AddMinutes(-1));
    }

    [Fact]
    public async Task OnStatusChanging_ToProcessingAgain_DoesNotOverwriteExistingDate()
    {
        // Arrange
        var existingDate = DateTime.UtcNow.AddDays(-1);
        var order = CreateOrder(OrderStatus.Processing);
        order.ProcessingStartedDate = existingDate;

        // Act
        await _statusHandler.OnStatusChangingAsync(order, OrderStatus.Processing, OrderStatus.Processing);

        // Assert - Should not overwrite the existing date
        order.ProcessingStartedDate.ShouldBe(existingDate);
    }

    [Fact]
    public async Task OnStatusChanging_ToShipped_SetsShippedDate()
    {
        // Arrange
        var order = CreateOrder(OrderStatus.Processing);
        order.ShippedDate.ShouldBeNull();

        // Act
        await _statusHandler.OnStatusChangingAsync(order, OrderStatus.Processing, OrderStatus.Shipped);

        // Assert
        order.ShippedDate.ShouldNotBeNull();
        order.ShippedDate.Value.ShouldBeGreaterThan(DateTime.UtcNow.AddMinutes(-1));
    }

    [Fact]
    public async Task OnStatusChanging_ToCompleted_SetsCompletedDate()
    {
        // Arrange
        var order = CreateOrder(OrderStatus.Shipped);
        order.CompletedDate.ShouldBeNull();

        // Act
        await _statusHandler.OnStatusChangingAsync(order, OrderStatus.Shipped, OrderStatus.Completed);

        // Assert
        order.CompletedDate.ShouldNotBeNull();
        order.CompletedDate.Value.ShouldBeGreaterThan(DateTime.UtcNow.AddMinutes(-1));
    }

    [Fact]
    public async Task OnStatusChanging_ToCancelled_SetsCancelledDate()
    {
        // Arrange
        var order = CreateOrder(OrderStatus.Pending);
        order.CancelledDate.ShouldBeNull();

        // Act
        await _statusHandler.OnStatusChangingAsync(order, OrderStatus.Pending, OrderStatus.Cancelled);

        // Assert
        order.CancelledDate.ShouldNotBeNull();
        order.CancelledDate.Value.ShouldBeGreaterThan(DateTime.UtcNow.AddMinutes(-1));
    }

    [Fact]
    public async Task OnStatusChanging_AlwaysUpdatesDateUpdated()
    {
        // Arrange
        var oldDate = DateTime.UtcNow.AddDays(-1);
        var order = CreateOrder(OrderStatus.Pending);
        order.DateUpdated = oldDate;

        // Act
        await _statusHandler.OnStatusChangingAsync(order, OrderStatus.Pending, OrderStatus.ReadyToFulfill);

        // Assert
        order.DateUpdated.ShouldBeGreaterThan(oldDate);
    }

    #endregion

    private Order CreateOrder(OrderStatus status)
    {
        var billing = _addressFactory.CreateFromFormData(
            firstName: "Test",
            lastName: "Customer",
            address1: "123 Test Street",
            address2: null,
            city: "London",
            postalCode: "SW1A 1AA",
            countryCode: "GB",
            regionCode: null,
            phone: null,
            email: "test@example.com");
        var shipping = _addressFactory.CreateFromFormData(
            firstName: "Test",
            lastName: "Customer",
            address1: "123 Test Street",
            address2: null,
            city: "London",
            postalCode: "SW1A 1AA",
            countryCode: "GB",
            regionCode: null,
            phone: null,
            email: "test@example.com");

        var invoice = _invoiceFactory.CreateManual(
            invoiceNumber: $"INV-{Guid.NewGuid():N}"[..12],
            customerId: Guid.NewGuid(),
            billingAddress: billing,
            shippingAddress: shipping,
            currencyCode: "USD",
            subTotal: 100m,
            tax: 20m,
            total: 120m);

        var warehouse = _warehouseFactory.Create(
            "Test Warehouse",
            _addressFactory.CreateFromFormData(
                firstName: "Warehouse",
                lastName: "Address",
                address1: "1 Depot Way",
                address2: null,
                city: "London",
                postalCode: "SW1A 1AA",
                countryCode: "GB",
                regionCode: null,
                phone: null,
                email: null));
        warehouse.Id = Guid.NewGuid();

        return _orderFactory.Create(invoice, warehouse.Id, Guid.NewGuid(), shippingCost: 0m, status: status);
    }
}
