namespace Merchello.Core.Fulfilment.Models;

/// <summary>
/// Request to submit an order to a fulfilment provider.
/// </summary>
public record FulfilmentOrderRequest
{
    public required Guid OrderId { get; init; }
    public required string OrderNumber { get; init; }
    public required IReadOnlyList<FulfilmentLineItem> LineItems { get; init; }
    public required FulfilmentAddress ShippingAddress { get; init; }
    public FulfilmentAddress? BillingAddress { get; init; }
    public string? CustomerEmail { get; init; }
    public string? CustomerPhone { get; init; }
    public string? ShippingServiceCode { get; init; }
    public DateTime? RequestedDeliveryDate { get; init; }
    public string? InternalNotes { get; init; }
    public Dictionary<string, object> ExtendedData { get; init; } = [];
}
