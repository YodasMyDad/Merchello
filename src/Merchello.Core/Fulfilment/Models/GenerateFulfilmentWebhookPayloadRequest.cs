namespace Merchello.Core.Fulfilment.Models;

/// <summary>
/// Request used to generate a provider-specific fulfilment webhook payload for testing.
/// </summary>
public class GenerateFulfilmentWebhookPayloadRequest
{
    /// <summary>
    /// Provider-specific event type (for example, "order.shipped").
    /// </summary>
    public required string EventType { get; init; }

    /// <summary>
    /// Provider reference to include in generated payload.
    /// </summary>
    public string? ProviderReference { get; init; }

    /// <summary>
    /// Optional provider shipment identifier.
    /// </summary>
    public string? ProviderShipmentId { get; init; }

    /// <summary>
    /// Optional tracking number.
    /// </summary>
    public string? TrackingNumber { get; init; }

    /// <summary>
    /// Optional carrier name.
    /// </summary>
    public string? Carrier { get; init; }

    /// <summary>
    /// Optional shipped date.
    /// </summary>
    public DateTime? ShippedDate { get; init; }

    /// <summary>
    /// Optional custom payload override. When set, provider should return this payload as-is.
    /// </summary>
    public string? CustomPayload { get; init; }
}
