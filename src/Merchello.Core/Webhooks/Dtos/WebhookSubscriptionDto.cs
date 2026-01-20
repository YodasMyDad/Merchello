using Merchello.Core.Webhooks.Models.Enums;

namespace Merchello.Core.Webhooks.Dtos;

/// <summary>
/// DTO for webhook subscription list items.
/// </summary>
public class WebhookSubscriptionDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Topic { get; set; } = string.Empty;
    public string TopicDisplayName { get; set; } = string.Empty;
    public string TargetUrl { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public WebhookAuthType AuthType { get; set; }
    public string AuthTypeDisplay { get; set; } = string.Empty;
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    public DateTime? LastTriggeredUtc { get; set; }
    public DateTime? LastSuccessUtc { get; set; }
    public string? LastErrorMessage { get; set; }
    public DateTime DateCreated { get; set; }
}
