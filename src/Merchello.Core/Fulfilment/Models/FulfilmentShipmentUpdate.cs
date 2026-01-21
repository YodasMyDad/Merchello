namespace Merchello.Core.Fulfilment.Models;

/// <summary>
/// Shipment update received from a fulfilment provider.
/// </summary>
public record FulfilmentShipmentUpdate
{
    public required string ProviderReference { get; init; }
    public required string ProviderShipmentId { get; init; }
    public string? TrackingNumber { get; init; }
    public string? TrackingUrl { get; init; }
    public string? Carrier { get; init; }
    public DateTime? ShippedDate { get; init; }
    public IReadOnlyList<FulfilmentShippedItem>? Items { get; init; }
}
