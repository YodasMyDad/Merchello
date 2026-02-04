namespace Merchello.Core.Protocols;

/// <summary>
/// Protocol order fulfillment event types.
/// </summary>
public static class ProtocolFulfillmentEventTypes
{
    public const string Processing = "processing";
    public const string Shipped = "shipped";
    public const string InTransit = "in_transit";
    public const string Delivered = "delivered";
    public const string FailedAttempt = "failed_attempt";
    public const string Canceled = "canceled";
    public const string Undeliverable = "undeliverable";
    public const string ReturnedToSender = "returned_to_sender";
}
