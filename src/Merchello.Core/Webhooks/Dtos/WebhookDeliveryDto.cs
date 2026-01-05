using Merchello.Core.Webhooks.Models.Enums;

namespace Merchello.Core.Webhooks.Dtos;

/// <summary>
/// DTO for webhook delivery list items.
/// </summary>
public class WebhookDeliveryDto
{
    public Guid Id { get; set; }
    public Guid SubscriptionId { get; set; }
    public string Topic { get; set; } = string.Empty;
    public Guid? EntityId { get; set; }
    public string? EntityType { get; set; }
    public WebhookDeliveryStatus Status { get; set; }
    public string StatusDisplay { get; set; } = string.Empty;
    public int? ResponseStatusCode { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime DateCreated { get; set; }
    public DateTime? DateCompleted { get; set; }
    public int DurationMs { get; set; }
    public int AttemptNumber { get; set; }
}

/// <summary>
/// DTO for webhook delivery details including request/response bodies.
/// </summary>
public class WebhookDeliveryDetailDto : WebhookDeliveryDto
{
    public string TargetUrl { get; set; } = string.Empty;
    public string RequestBody { get; set; } = string.Empty;
    public string RequestHeaders { get; set; } = string.Empty;
    public string? ResponseBody { get; set; }
    public string? ResponseHeaders { get; set; }
}
