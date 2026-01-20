namespace Merchello.Core.Webhooks.Dtos;

/// <summary>
/// DTO for webhook subscription details including recent deliveries.
/// </summary>
public class WebhookSubscriptionDetailDto : WebhookSubscriptionDto
{
    public string? ApiVersion { get; set; }
    public int TimeoutSeconds { get; set; }
    public string? FilterExpression { get; set; }
    public Dictionary<string, string> Headers { get; set; } = [];
    public List<OutboundDeliveryDto> RecentDeliveries { get; set; } = [];
}
