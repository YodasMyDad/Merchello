using Merchello.Core.Accounting.Models;

namespace Merchello.Core.Fulfilment.Providers.ShipBob;

/// <summary>
/// Maps ShipBob order and shipment statuses to Merchello OrderStatus.
/// </summary>
public static class ShipBobStatusMapper
{
    /// <summary>
    /// Maps ShipBob order status to Merchello OrderStatus.
    /// </summary>
    /// <param name="shipBobStatus">The status string from ShipBob API.</param>
    /// <returns>The corresponding Merchello OrderStatus.</returns>
    public static OrderStatus MapOrderStatus(string? shipBobStatus)
    {
        if (string.IsNullOrWhiteSpace(shipBobStatus))
        {
            return OrderStatus.Processing;
        }

        return shipBobStatus.ToLowerInvariant() switch
        {
            // Processing states
            "processing" or "pending" => OrderStatus.Processing,

            // Fulfilled/shipped states - label purchased and being delivered
            "fulfilled" or "completed" or "shipped" => OrderStatus.Shipped,
            "intransit" or "in_transit" or "in transit" => OrderStatus.Shipped,
            "outfordelivery" or "out_for_delivery" or "out for delivery" => OrderStatus.Shipped,

            // Delivered - order complete
            "delivered" => OrderStatus.Completed,

            // Partial fulfillment
            "partiallyfulfilled" or "partially_fulfilled" or "partially fulfilled" => OrderStatus.PartiallyShipped,

            // Exception states - need attention
            "exception" => OrderStatus.OnHold,
            "outofstock" or "out_of_stock" or "out of stock" => OrderStatus.OnHold,
            "unknownsku" or "unknown_sku" or "unknown sku" => OrderStatus.OnHold,
            "oversized" => OrderStatus.OnHold,

            // On Hold states - various reasons
            "onhold" or "on_hold" or "on hold" => OrderStatus.OnHold,
            "paymentdeclined" or "payment_declined" or "payment declined" => OrderStatus.OnHold,
            "invalidaddress" or "invalid_address" or "invalid address" => OrderStatus.OnHold,
            "customerrequested" or "customer_requested" or "customer requested" => OrderStatus.OnHold,
            "reservedatenotmet" or "reserve_date_not_met" => OrderStatus.OnHold,
            "missingtariffinformation" or "missing_tariff_information" => OrderStatus.OnHold,
            "manual" => OrderStatus.OnHold,

            // Cancelled
            "cancelled" or "canceled" => OrderStatus.Cancelled,

            // Default to processing for unknown statuses
            _ => OrderStatus.Processing
        };
    }

    /// <summary>
    /// Maps ShipBob shipment status to Merchello OrderStatus.
    /// This is more granular than order status.
    /// </summary>
    /// <param name="shipmentStatus">The shipment status string.</param>
    /// <param name="statusDetailId">Optional status detail ID for more precision.</param>
    /// <returns>The corresponding Merchello OrderStatus.</returns>
    public static OrderStatus MapShipmentStatus(string? shipmentStatus, int? statusDetailId = null)
    {
        if (string.IsNullOrWhiteSpace(shipmentStatus))
        {
            return OrderStatus.Processing;
        }

        // First check by status detail ID for more precision
        if (statusDetailId.HasValue)
        {
            var statusById = MapStatusDetailId(statusDetailId.Value);
            if (statusById != null)
            {
                return statusById.Value;
            }
        }

        return shipmentStatus.ToLowerInvariant() switch
        {
            // Processing sub-states (100-102)
            "picked" => OrderStatus.Processing,
            "packed" => OrderStatus.Processing,
            "labeled" => OrderStatus.Shipped, // Label printed = shipped

            // Completed/delivery sub-states (200-204)
            "processing" => OrderStatus.Processing,
            "intransit" or "in_transit" or "in transit" => OrderStatus.Shipped,
            "outfordelivery" or "out_for_delivery" or "out for delivery" => OrderStatus.Shipped,
            "delivered" => OrderStatus.Completed,
            "deliveryexception" or "delivery_exception" => OrderStatus.OnHold,

            // Exception states (300-308)
            "exception" => OrderStatus.OnHold,
            "bundle" => OrderStatus.OnHold,
            "mergeditem" or "merged_item" => OrderStatus.OnHold,
            "inactivesku" or "inactive_sku" => OrderStatus.OnHold,
            "outofstock" or "out_of_stock" => OrderStatus.OnHold,
            "unknownsku" or "unknown_sku" => OrderStatus.OnHold,
            "internaltransferinprogress" => OrderStatus.OnHold,
            "bintransferinprogress" => OrderStatus.OnHold,
            "inventoryinnonpickablelocation" => OrderStatus.OnHold,
            "inventorypartiallycommitted" => OrderStatus.OnHold,

            // On Hold states (400-408)
            "onhold" or "on_hold" or "on hold" => OrderStatus.OnHold,
            "paymentdeclined" or "payment_declined" => OrderStatus.OnHold,
            "invalidaddress" or "invalid_address" => OrderStatus.OnHold,
            "reservedatenotmet" or "reserve_date_not_met" => OrderStatus.OnHold,
            "missingtariffinformation" => OrderStatus.OnHold,
            "manual" => OrderStatus.OnHold,
            "internationalhazmat" => OrderStatus.OnHold,
            "packagepreferencenotset" => OrderStatus.OnHold,
            "autoprocessingpause" => OrderStatus.OnHold,

            // Completed/fulfilled
            "completed" or "fulfilled" => OrderStatus.Shipped,

            // Cancelled
            "cancelled" or "canceled" => OrderStatus.Cancelled,

            _ => OrderStatus.Processing
        };
    }

    /// <summary>
    /// Maps ShipBob status detail ID to Merchello OrderStatus.
    /// </summary>
    private static OrderStatus? MapStatusDetailId(int statusDetailId)
    {
        return statusDetailId switch
        {
            // Processing statuses (100-102)
            100 => OrderStatus.Processing, // Picked
            101 => OrderStatus.Processing, // Packed
            102 => OrderStatus.Shipped,    // Labeled

            // Completed statuses (200-204)
            200 => OrderStatus.Processing,   // Processing
            201 => OrderStatus.Shipped,      // InTransit
            202 => OrderStatus.Shipped,      // OutForDelivery
            203 => OrderStatus.Completed,    // Delivered
            204 => OrderStatus.OnHold,       // DeliveryException

            // Exception statuses (300-308)
            >= 300 and <= 308 => OrderStatus.OnHold,

            // On Hold statuses (400-408)
            >= 400 and <= 408 => OrderStatus.OnHold,

            _ => null // Unknown, let the caller fall back
        };
    }

    /// <summary>
    /// Maps webhook topic to a normalized event type.
    /// </summary>
    /// <param name="topic">The webhook topic from ShipBob.</param>
    /// <returns>Normalized event type string.</returns>
    public static string MapWebhookTopic(string? topic)
    {
        if (string.IsNullOrWhiteSpace(topic))
        {
            return "unknown";
        }

        return topic.ToLowerInvariant() switch
        {
            // Date-versioned format (for example 2025-07, 2026-01)
            "order.shipped" => "shipped",
            "order.shipment.delivered" => "delivered",
            "order.shipment.exception" => "exception",
            "order.shipment.on_hold" => "on_hold",
            "order.shipment.cancelled" => "cancelled",

            // Legacy format
            "order_shipped" => "shipped",
            "shipment_delivered" => "delivered",
            "shipment_exception" => "exception",
            "shipment_onhold" => "on_hold",
            "shipment_cancelled" => "cancelled",

            _ => "unknown"
        };
    }

    /// <summary>
    /// Maps webhook topic to the expected OrderStatus.
    /// </summary>
    /// <param name="topic">The webhook topic from ShipBob.</param>
    /// <returns>The expected Merchello OrderStatus for this event.</returns>
    public static OrderStatus MapWebhookTopicToStatus(string? topic)
    {
        var eventType = MapWebhookTopic(topic);

        return eventType switch
        {
            "shipped" => OrderStatus.Shipped,
            "delivered" => OrderStatus.Completed,
            "exception" => OrderStatus.OnHold,
            "on_hold" => OrderStatus.OnHold,
            "cancelled" => OrderStatus.Cancelled,
            _ => OrderStatus.Processing
        };
    }

    /// <summary>
    /// Determines if a shipment status indicates the order has shipped.
    /// </summary>
    public static bool IsShippedStatus(string? status)
    {
        var mapped = MapOrderStatus(status);
        return mapped is OrderStatus.Shipped or OrderStatus.PartiallyShipped or OrderStatus.Completed;
    }

    /// <summary>
    /// Determines if a status indicates a problem that needs attention.
    /// </summary>
    public static bool IsExceptionStatus(string? status) =>
        MapOrderStatus(status) == OrderStatus.OnHold;

    /// <summary>
    /// Determines if a status indicates the order is complete.
    /// </summary>
    public static bool IsCompletedStatus(string? status) =>
        MapOrderStatus(status) == OrderStatus.Completed;
}
