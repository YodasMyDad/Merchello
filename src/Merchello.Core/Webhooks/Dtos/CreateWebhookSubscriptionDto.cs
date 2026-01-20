using Merchello.Core.Webhooks.Models.Enums;

namespace Merchello.Core.Webhooks.Dtos;

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
