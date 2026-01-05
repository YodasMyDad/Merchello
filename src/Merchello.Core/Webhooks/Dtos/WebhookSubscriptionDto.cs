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

/// <summary>
/// DTO for webhook subscription details including recent deliveries.
/// </summary>
public class WebhookSubscriptionDetailDto : WebhookSubscriptionDto
{
    public string? ApiVersion { get; set; }
    public int TimeoutSeconds { get; set; }
    public string? FilterExpression { get; set; }
    public Dictionary<string, string> Headers { get; set; } = [];
    public List<WebhookDeliveryDto> RecentDeliveries { get; set; } = [];
}

/// <summary>
/// DTO for creating a new webhook subscription.
/// </summary>
public class CreateWebhookSubscriptionDto
{
    public string Name { get; set; } = string.Empty;
    public string Topic { get; set; } = string.Empty;
    public string TargetUrl { get; set; } = string.Empty;
    public WebhookAuthType AuthType { get; set; } = WebhookAuthType.HmacSha256;
    public string? AuthHeaderName { get; set; }
    public string? AuthHeaderValue { get; set; }
    public int TimeoutSeconds { get; set; } = 30;
    public string? FilterExpression { get; set; }
    public Dictionary<string, string>? Headers { get; set; }
}

/// <summary>
/// DTO for updating an existing webhook subscription.
/// </summary>
public class UpdateWebhookSubscriptionDto
{
    public string? Name { get; set; }
    public string? TargetUrl { get; set; }
    public bool? IsActive { get; set; }
    public WebhookAuthType? AuthType { get; set; }
    public string? AuthHeaderName { get; set; }
    public string? AuthHeaderValue { get; set; }
    public int? TimeoutSeconds { get; set; }
    public string? FilterExpression { get; set; }
    public Dictionary<string, string>? Headers { get; set; }
}
