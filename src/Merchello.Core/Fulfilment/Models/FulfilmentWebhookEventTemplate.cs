namespace Merchello.Core.Fulfilment.Models;

/// <summary>
/// Defines a fulfilment webhook event that can be simulated in test UI.
/// </summary>
public class FulfilmentWebhookEventTemplate
{
    /// <summary>
    /// Provider-specific event type (for example, "order.shipped").
    /// </summary>
    public required string EventType { get; init; }

    /// <summary>
    /// Human-readable event name.
    /// </summary>
    public required string DisplayName { get; init; }

    /// <summary>
    /// Optional event description.
    /// </summary>
    public string? Description { get; init; }
}
