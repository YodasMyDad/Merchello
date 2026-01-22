using Merchello.Core.Accounting.Models;
using Merchello.Core.Fulfilment.Providers.ShipBob;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Fulfilment.Providers.ShipBob;

public class ShipBobStatusMapperTests
{
    #region MapOrderStatus Tests

    [Theory]
    [InlineData("Processing", OrderStatus.Processing)]
    [InlineData("Pending", OrderStatus.Processing)]
    [InlineData("processing", OrderStatus.Processing)]
    [InlineData("PROCESSING", OrderStatus.Processing)]
    public void MapOrderStatus_ProcessingStates_ReturnsProcessing(string status, OrderStatus expected)
    {
        var result = ShipBobStatusMapper.MapOrderStatus(status);
        result.ShouldBe(expected);
    }

    [Theory]
    [InlineData("Fulfilled", OrderStatus.Shipped)]
    [InlineData("Completed", OrderStatus.Shipped)]
    [InlineData("InTransit", OrderStatus.Shipped)]
    [InlineData("in_transit", OrderStatus.Shipped)]
    [InlineData("OutForDelivery", OrderStatus.Shipped)]
    [InlineData("out_for_delivery", OrderStatus.Shipped)]
    public void MapOrderStatus_ShippedStates_ReturnsShipped(string status, OrderStatus expected)
    {
        var result = ShipBobStatusMapper.MapOrderStatus(status);
        result.ShouldBe(expected);
    }

    [Theory]
    [InlineData("Delivered")]
    [InlineData("delivered")]
    public void MapOrderStatus_Delivered_ReturnsCompleted(string status)
    {
        var result = ShipBobStatusMapper.MapOrderStatus(status);
        result.ShouldBe(OrderStatus.Completed);
    }

    [Theory]
    [InlineData("PartiallyFulfilled", OrderStatus.PartiallyShipped)]
    [InlineData("partially_fulfilled", OrderStatus.PartiallyShipped)]
    public void MapOrderStatus_PartiallyFulfilled_ReturnsPartiallyShipped(string status, OrderStatus expected)
    {
        var result = ShipBobStatusMapper.MapOrderStatus(status);
        result.ShouldBe(expected);
    }

    [Theory]
    [InlineData("Exception", OrderStatus.OnHold)]
    [InlineData("OutOfStock", OrderStatus.OnHold)]
    [InlineData("out_of_stock", OrderStatus.OnHold)]
    [InlineData("UnknownSku", OrderStatus.OnHold)]
    [InlineData("Oversized", OrderStatus.OnHold)]
    [InlineData("OnHold", OrderStatus.OnHold)]
    [InlineData("on_hold", OrderStatus.OnHold)]
    [InlineData("PaymentDeclined", OrderStatus.OnHold)]
    [InlineData("InvalidAddress", OrderStatus.OnHold)]
    [InlineData("CustomerRequested", OrderStatus.OnHold)]
    public void MapOrderStatus_ExceptionAndHoldStates_ReturnsOnHold(string status, OrderStatus expected)
    {
        var result = ShipBobStatusMapper.MapOrderStatus(status);
        result.ShouldBe(expected);
    }

    [Theory]
    [InlineData("Cancelled", OrderStatus.Cancelled)]
    [InlineData("Canceled", OrderStatus.Cancelled)]
    [InlineData("cancelled", OrderStatus.Cancelled)]
    public void MapOrderStatus_CancelledStates_ReturnsCancelled(string status, OrderStatus expected)
    {
        var result = ShipBobStatusMapper.MapOrderStatus(status);
        result.ShouldBe(expected);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void MapOrderStatus_NullOrEmpty_ReturnsProcessing(string? status)
    {
        var result = ShipBobStatusMapper.MapOrderStatus(status);
        result.ShouldBe(OrderStatus.Processing);
    }

    [Theory]
    [InlineData("UnknownStatus")]
    [InlineData("SomeRandomStatus")]
    [InlineData("InvalidStatus")]
    public void MapOrderStatus_UnknownStatus_ReturnsProcessing(string status)
    {
        var result = ShipBobStatusMapper.MapOrderStatus(status);
        result.ShouldBe(OrderStatus.Processing);
    }

    #endregion

    #region MapShipmentStatus Tests

    [Theory]
    [InlineData("Picked", null, OrderStatus.Processing)]
    [InlineData("Packed", null, OrderStatus.Processing)]
    [InlineData("Labeled", null, OrderStatus.Shipped)]
    public void MapShipmentStatus_ProcessingSubStates_MapsCorrectly(string status, int? detailId, OrderStatus expected)
    {
        var result = ShipBobStatusMapper.MapShipmentStatus(status, detailId);
        result.ShouldBe(expected);
    }

    [Theory]
    [InlineData(100, OrderStatus.Processing)] // Picked
    [InlineData(101, OrderStatus.Processing)] // Packed
    [InlineData(102, OrderStatus.Shipped)]    // Labeled
    [InlineData(200, OrderStatus.Processing)] // Processing
    [InlineData(201, OrderStatus.Shipped)]    // InTransit
    [InlineData(202, OrderStatus.Shipped)]    // OutForDelivery
    [InlineData(203, OrderStatus.Completed)]  // Delivered
    [InlineData(204, OrderStatus.OnHold)]     // DeliveryException
    public void MapShipmentStatus_ByDetailId_MapsCorrectly(int detailId, OrderStatus expected)
    {
        var result = ShipBobStatusMapper.MapShipmentStatus("AnyStatus", detailId);
        result.ShouldBe(expected);
    }

    [Theory]
    [InlineData(300, OrderStatus.OnHold)] // Exception range start
    [InlineData(305, OrderStatus.OnHold)] // Mid exception range
    [InlineData(308, OrderStatus.OnHold)] // Exception range end
    [InlineData(400, OrderStatus.OnHold)] // On Hold range start
    [InlineData(405, OrderStatus.OnHold)] // Mid On Hold range
    [InlineData(408, OrderStatus.OnHold)] // On Hold range end
    public void MapShipmentStatus_ExceptionAndOnHoldDetailIds_ReturnOnHold(int detailId, OrderStatus expected)
    {
        var result = ShipBobStatusMapper.MapShipmentStatus("AnyStatus", detailId);
        result.ShouldBe(expected);
    }

    [Fact]
    public void MapShipmentStatus_UnknownDetailId_FallsBackToStatusString()
    {
        // Unknown detail ID (999) should fall back to parsing the status string
        var result = ShipBobStatusMapper.MapShipmentStatus("Delivered", 999);
        result.ShouldBe(OrderStatus.Completed);
    }

    #endregion

    #region MapWebhookTopic Tests

    [Theory]
    [InlineData("order.shipped", "shipped")]
    [InlineData("order.shipment.delivered", "delivered")]
    [InlineData("order.shipment.exception", "exception")]
    [InlineData("order.shipment.on_hold", "on_hold")]
    [InlineData("order.shipment.cancelled", "cancelled")]
    public void MapWebhookTopic_NewFormat_MapsCorrectly(string topic, string expected)
    {
        var result = ShipBobStatusMapper.MapWebhookTopic(topic);
        result.ShouldBe(expected);
    }

    [Theory]
    [InlineData("order_shipped", "shipped")]
    [InlineData("shipment_delivered", "delivered")]
    [InlineData("shipment_exception", "exception")]
    [InlineData("shipment_onhold", "on_hold")]
    [InlineData("shipment_cancelled", "cancelled")]
    public void MapWebhookTopic_LegacyFormat_MapsCorrectly(string topic, string expected)
    {
        var result = ShipBobStatusMapper.MapWebhookTopic(topic);
        result.ShouldBe(expected);
    }

    [Theory]
    [InlineData(null, "unknown")]
    [InlineData("", "unknown")]
    [InlineData("some.random.topic", "unknown")]
    public void MapWebhookTopic_UnknownTopics_ReturnsUnknown(string? topic, string expected)
    {
        var result = ShipBobStatusMapper.MapWebhookTopic(topic);
        result.ShouldBe(expected);
    }

    #endregion

    #region MapWebhookTopicToStatus Tests

    [Theory]
    [InlineData("order.shipped", OrderStatus.Shipped)]
    [InlineData("order.shipment.delivered", OrderStatus.Completed)]
    [InlineData("order.shipment.exception", OrderStatus.OnHold)]
    [InlineData("order.shipment.on_hold", OrderStatus.OnHold)]
    [InlineData("order.shipment.cancelled", OrderStatus.Cancelled)]
    public void MapWebhookTopicToStatus_MapsCorrectly(string topic, OrderStatus expected)
    {
        var result = ShipBobStatusMapper.MapWebhookTopicToStatus(topic);
        result.ShouldBe(expected);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("unknown.topic")]
    public void MapWebhookTopicToStatus_UnknownTopic_ReturnsProcessing(string? topic)
    {
        var result = ShipBobStatusMapper.MapWebhookTopicToStatus(topic);
        result.ShouldBe(OrderStatus.Processing);
    }

    #endregion

    #region Helper Method Tests

    [Theory]
    [InlineData("Fulfilled", true)]
    [InlineData("Shipped", true)]
    [InlineData("InTransit", true)]
    [InlineData("Delivered", true)]
    [InlineData("PartiallyFulfilled", true)]
    [InlineData("Processing", false)]
    [InlineData("OnHold", false)]
    [InlineData("Cancelled", false)]
    public void IsShippedStatus_ReturnsCorrectValue(string status, bool expected)
    {
        var result = ShipBobStatusMapper.IsShippedStatus(status);
        result.ShouldBe(expected);
    }

    [Theory]
    [InlineData("Exception", true)]
    [InlineData("OnHold", true)]
    [InlineData("OutOfStock", true)]
    [InlineData("InvalidAddress", true)]
    [InlineData("Processing", false)]
    [InlineData("Shipped", false)]
    [InlineData("Delivered", false)]
    public void IsExceptionStatus_ReturnsCorrectValue(string status, bool expected)
    {
        var result = ShipBobStatusMapper.IsExceptionStatus(status);
        result.ShouldBe(expected);
    }

    [Theory]
    [InlineData("Delivered", true)]
    [InlineData("delivered", true)]
    [InlineData("Shipped", false)]
    [InlineData("Processing", false)]
    [InlineData("Completed", false)] // Maps to Shipped, not Completed
    public void IsCompletedStatus_ReturnsCorrectValue(string status, bool expected)
    {
        var result = ShipBobStatusMapper.IsCompletedStatus(status);
        result.ShouldBe(expected);
    }

    #endregion
}
