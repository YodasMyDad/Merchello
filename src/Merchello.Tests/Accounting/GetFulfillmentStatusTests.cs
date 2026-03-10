using Merchello.Core;
using Merchello.Core.Accounting.Extensions;
using Merchello.Core.Accounting.Models;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Accounting;

public class GetFulfillmentStatusTests
{
    [Fact]
    public void GetFulfillmentStatus_EmptyOrders_ReturnsUnfulfilled()
    {
        var orders = Array.Empty<Order>();
        orders.GetFulfillmentStatus().ShouldBe(Constants.StatusLabels.Fulfillment.Unfulfilled);
    }

    [Fact]
    public void GetFulfillmentStatus_AllShipped_ReturnsFulfilled()
    {
        var orders = new List<Order>
        {
            new() { Status = OrderStatus.Shipped },
            new() { Status = OrderStatus.Completed }
        };

        orders.GetFulfillmentStatus().ShouldBe(Constants.StatusLabels.Fulfillment.Fulfilled);
    }

    [Fact]
    public void GetFulfillmentStatus_SomeShipped_ReturnsPartial()
    {
        var orders = new List<Order>
        {
            new() { Status = OrderStatus.Shipped },
            new() { Status = OrderStatus.ReadyToFulfill }
        };

        orders.GetFulfillmentStatus().ShouldBe(Constants.StatusLabels.Fulfillment.Partial);
    }

    [Fact]
    public void GetFulfillmentStatus_AllProcessing_ReturnsProcessing()
    {
        var orders = new List<Order>
        {
            new() { Status = OrderStatus.Processing },
            new() { Status = OrderStatus.Processing }
        };

        orders.GetFulfillmentStatus().ShouldBe(Constants.StatusLabels.Fulfillment.Processing);
    }

    [Fact]
    public void GetFulfillmentStatus_MixedProcessingAndReadyToFulfill_ReturnsProcessing()
    {
        var orders = new List<Order>
        {
            new() { Status = OrderStatus.Processing },
            new() { Status = OrderStatus.ReadyToFulfill }
        };

        orders.GetFulfillmentStatus().ShouldBe(Constants.StatusLabels.Fulfillment.Processing);
    }

    [Fact]
    public void GetFulfillmentStatus_AllReadyToFulfill_ReturnsUnfulfilled()
    {
        var orders = new List<Order>
        {
            new() { Status = OrderStatus.ReadyToFulfill },
            new() { Status = OrderStatus.Pending }
        };

        orders.GetFulfillmentStatus().ShouldBe(Constants.StatusLabels.Fulfillment.Unfulfilled);
    }

    [Fact]
    public void GetFulfillmentStatus_ShippedAndProcessing_ReturnsPartial()
    {
        // Shipped takes priority over Processing
        var orders = new List<Order>
        {
            new() { Status = OrderStatus.Shipped },
            new() { Status = OrderStatus.Processing }
        };

        orders.GetFulfillmentStatus().ShouldBe(Constants.StatusLabels.Fulfillment.Partial);
    }

    [Fact]
    public void GetFulfillmentStatusCssClass_Processing_ReturnsWarning()
    {
        var orders = new List<Order>
        {
            new() { Status = OrderStatus.Processing }
        };

        orders.GetFulfillmentStatusCssClass().ShouldBe(Constants.StatusLabels.CssClasses.Warning);
    }
}
