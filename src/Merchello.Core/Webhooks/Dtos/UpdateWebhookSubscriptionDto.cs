using Merchello.Core.Webhooks.Models.Enums;

namespace Merchello.Core.Webhooks.Dtos;

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
