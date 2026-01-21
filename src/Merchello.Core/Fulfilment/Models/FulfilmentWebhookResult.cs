namespace Merchello.Core.Fulfilment.Models;

/// <summary>
/// Result of processing a webhook from a fulfilment provider.
/// </summary>
public record FulfilmentWebhookResult
{
    public bool Success { get; init; }
    public string? EventType { get; init; }
    public IReadOnlyList<FulfilmentStatusUpdate> StatusUpdates { get; init; } = [];
    public IReadOnlyList<FulfilmentShipmentUpdate> ShipmentUpdates { get; init; } = [];
    public IReadOnlyList<FulfilmentInventoryLevel> InventoryUpdates { get; init; } = [];
    public string? ErrorMessage { get; init; }

    public static FulfilmentWebhookResult NotSupported() => new() { Success = false, ErrorMessage = "Provider does not support webhooks" };
}
