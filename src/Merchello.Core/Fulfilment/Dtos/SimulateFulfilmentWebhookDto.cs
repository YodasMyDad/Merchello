namespace Merchello.Core.Fulfilment.Dtos;

/// <summary>
/// DTO used to simulate an inbound fulfilment webhook.
/// </summary>
public class SimulateFulfilmentWebhookDto
{
    /// <summary>
    /// Provider-specific event type to simulate.
    /// </summary>
    public required string EventType { get; set; }

    /// <summary>
    /// Optional provider reference to include in generated payload.
    /// </summary>
    public string? ProviderReference { get; set; }

    /// <summary>
    /// Optional provider shipment identifier.
    /// </summary>
    public string? ProviderShipmentId { get; set; }

    /// <summary>
    /// Optional tracking number.
    /// </summary>
    public string? TrackingNumber { get; set; }

    /// <summary>
    /// Optional carrier name.
    /// </summary>
    public string? Carrier { get; set; }

    /// <summary>
    /// Optional shipped date.
    /// </summary>
    public DateTime? ShippedDate { get; set; }

    /// <summary>
    /// Optional custom JSON payload.
    /// </summary>
    public string? CustomPayload { get; set; }
}
