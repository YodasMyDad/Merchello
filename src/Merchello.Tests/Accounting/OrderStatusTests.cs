using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services;
using Microsoft.Extensions.Logging;
using Moq;
using Shouldly;

namespace Merchello.Tests.Accounting;

public class OrderStatusTests
{
    private readonly DefaultOrderStatusHandler _statusHandler;
    private readonly Mock<ILogger<DefaultOrderStatusHandler>> _loggerMock;

    public OrderStatusTests()
    {
        _loggerMock = new Mock<ILogger<DefaultOrderStatusHandler>>();
        _statusHandler = new DefaultOrderStatusHandler(_loggerMock.Object);
    }

    [Fact]
    public async Task CanTransition_FromPendingToReadyToFulfill_ReturnsTrue()
    {
        // Arrange
        var order = new Order { Status = OrderStatus.Pending };

        // Act
        var canTransition = await _statusHandler.CanTransitionAsync(order, OrderStatus.ReadyToFulfill);

        // Assert
        canTransition.ShouldBeTrue();
    }

    [Fact]
    public async Task CanTransition_FromCancelledToAnyStatus_ReturnsFalse()
    {
        // Arrange
        var order = new Order { Status = OrderStatus.Cancelled };

        // Act & Assert
        (await _statusHandler.CanTransitionAsync(order, OrderStatus.ReadyToFulfill)).ShouldBeFalse();
        (await _statusHandler.CanTransitionAsync(order, OrderStatus.Shipped)).ShouldBeFalse();
        (await _statusHandler.CanTransitionAsync(order, OrderStatus.Processing)).ShouldBeFalse();
    }

    [Fact]
    public async Task CanTransition_FromCompletedToAnyStatus_ReturnsFalse()
    {
        // Arrange
        var order = new Order { Status = OrderStatus.Completed };

        // Act & Assert
        (await _statusHandler.CanTransitionAsync(order, OrderStatus.Shipped)).ShouldBeFalse();
        (await _statusHandler.CanTransitionAsync(order, OrderStatus.Cancelled)).ShouldBeFalse();
    }

    [Fact]
    public async Task CanTransition_FromShippedToCancelled_ReturnsFalse()
    {
        // Arrange
        var order = new Order { Status = OrderStatus.Shipped };

        // Act
        var canTransition = await _statusHandler.CanTransitionAsync(order, OrderStatus.Cancelled);

        // Assert
        canTransition.ShouldBeFalse();
    }

    [Fact]
    public async Task CanTransition_FromPartiallyShippedToCancelled_ReturnsFalse()
    {
        // Arrange
        var order = new Order { Status = OrderStatus.PartiallyShipped };

        // Act
        var canTransition = await _statusHandler.CanTransitionAsync(order, OrderStatus.Cancelled);

        // Assert
        canTransition.ShouldBeFalse();
    }

    [Fact]
    public async Task CanTransition_BackwardsInFulfillment_ReturnsFalse()
    {
        // Arrange
        var shippedOrder = new Order { Status = OrderStatus.Shipped };
        var processingOrder = new Order { Status = OrderStatus.Processing };

        // Act & Assert
        (await _statusHandler.CanTransitionAsync(shippedOrder, OrderStatus.Processing)).ShouldBeFalse();
        (await _statusHandler.CanTransitionAsync(shippedOrder, OrderStatus.ReadyToFulfill)).ShouldBeFalse();
        (await _statusHandler.CanTransitionAsync(processingOrder, OrderStatus.ReadyToFulfill)).ShouldBeFalse();
    }

    [Fact]
    public async Task CanTransition_SameStatus_ReturnsTrue()
    {
        // Arrange
        var order = new Order { Status = OrderStatus.Processing };

        // Act
        var canTransition = await _statusHandler.CanTransitionAsync(order, OrderStatus.Processing);

        // Assert
        canTransition.ShouldBeTrue();
    }

    [Fact]
    public async Task OnStatusChanging_ToProcessing_SetsProcessingStartedDate()
    {
        // Arrange
        var order = new Order { Status = OrderStatus.ReadyToFulfill };
        var oldDate = order.ProcessingStartedDate;

        // Act
        await _statusHandler.OnStatusChangingAsync(order, OrderStatus.ReadyToFulfill, OrderStatus.Processing);

        // Assert
        order.ProcessingStartedDate.ShouldNotBeNull();
        order.ProcessingStartedDate.Value.ShouldBeGreaterThan(oldDate ?? DateTime.MinValue);
    }

    [Fact]
    public async Task OnStatusChanging_ToShipped_SetsShippedDate()
    {
        // Arrange
        var order = new Order { Status = OrderStatus.Processing };

        // Act
        await _statusHandler.OnStatusChangingAsync(order, OrderStatus.Processing, OrderStatus.Shipped);

        // Assert
        order.ShippedDate.ShouldNotBeNull();
    }

    [Fact]
    public async Task OnStatusChanging_ToCompleted_SetsCompletedDate()
    {
        // Arrange
        var order = new Order { Status = OrderStatus.Shipped };

        // Act
        await _statusHandler.OnStatusChangingAsync(order, OrderStatus.Shipped, OrderStatus.Completed);

        // Assert
        order.CompletedDate.ShouldNotBeNull();
    }

    [Fact]
    public async Task OnStatusChanging_ToCancelled_SetsCancelledDate()
    {
        // Arrange
        var order = new Order { Status = OrderStatus.Pending };

        // Act
        await _statusHandler.OnStatusChangingAsync(order, OrderStatus.Pending, OrderStatus.Cancelled);

        // Assert
        order.CancelledDate.ShouldNotBeNull();
    }

    [Fact]
    public async Task OnStatusChanging_AlwaysUpdatesDateUpdated()
    {
        // Arrange
        var order = new Order
        {
            Status = OrderStatus.Pending,
            DateUpdated = DateTime.UtcNow.AddDays(-1)
        };
        var oldDate = order.DateUpdated;

        // Act
        await _statusHandler.OnStatusChangingAsync(order, OrderStatus.Pending, OrderStatus.ReadyToFulfill);

        // Assert
        order.DateUpdated.ShouldBeGreaterThan(oldDate);
    }
}

