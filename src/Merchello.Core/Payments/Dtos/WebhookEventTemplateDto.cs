namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// DTO for webhook event templates.
/// </summary>
public class WebhookEventTemplateDto
{
    /// <summary>
    /// The provider-specific event type string.
    /// </summary>
    public required string EventType { get; set; }

    /// <summary>
    /// Human-readable display name.
    /// </summary>
    public required string DisplayName { get; set; }

    /// <summary>
    /// Description of what this event represents.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Category for UI grouping.
    /// </summary>
    public string Category { get; set; } = "other";
}
