namespace Merchello.Core.Webhooks.Models;

/// <summary>
/// Represents an available webhook topic that can be subscribed to.
/// </summary>
public class WebhookTopic
{
    /// <summary>
    /// Unique key for the topic (e.g., "order.created").
    /// </summary>
    public string Key { get; set; } = string.Empty;

    /// <summary>
    /// Human-readable display name.
    /// </summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>
    /// Description of when this topic is triggered.
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Category for grouping (e.g., "Orders", "Products").
    /// </summary>
    public string Category { get; set; } = string.Empty;

    /// <summary>
    /// The DTO type used for the payload.
    /// </summary>
    public Type? PayloadType { get; set; }

    /// <summary>
    /// Example JSON payload for documentation.
    /// </summary>
    public string? SamplePayload { get; set; }
}
