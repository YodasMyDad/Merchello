namespace Merchello.Core.Fulfilment.Dtos;

/// <summary>
/// DTO describing a fulfilment webhook event template.
/// </summary>
public class FulfilmentWebhookEventTemplateDto
{
    /// <summary>
    /// Provider-specific event type.
    /// </summary>
    public required string EventType { get; set; }

    /// <summary>
    /// Human-readable display label.
    /// </summary>
    public required string DisplayName { get; set; }

    /// <summary>
    /// Optional description.
    /// </summary>
    public string? Description { get; set; }
}
