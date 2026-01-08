using Merchello.Core.Shared.Models.Enums;

namespace Merchello.Core.Webhooks.Dtos;

/// <summary>
/// DTO for outbound delivery list items.
/// </summary>
public class OutboundDeliveryDto
{
    public Guid Id { get; set; }
    public OutboundDeliveryType DeliveryType { get; set; }
    public string DeliveryTypeDisplay { get; set; } = string.Empty;
    public Guid ConfigurationId { get; set; }
    public string Topic { get; set; } = string.Empty;
    public Guid? EntityId { get; set; }
    public string? EntityType { get; set; }
    public OutboundDeliveryStatus Status { get; set; }
    public string StatusDisplay { get; set; } = string.Empty;
    public int? ResponseStatusCode { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime DateCreated { get; set; }
    public DateTime? DateCompleted { get; set; }
    public int DurationMs { get; set; }
    public int AttemptNumber { get; set; }
}

/// <summary>
/// DTO for outbound delivery details including request/response bodies.
/// </summary>
public class OutboundDeliveryDetailDto : OutboundDeliveryDto
{
    // Webhook-specific
    public string? TargetUrl { get; set; }
    public string? RequestBody { get; set; }
    public string? RequestHeaders { get; set; }
    public string? ResponseBody { get; set; }
    public string? ResponseHeaders { get; set; }

    // Email-specific
    public string? EmailRecipients { get; set; }
    public string? EmailSubject { get; set; }
    public string? EmailFrom { get; set; }
    public string? EmailBody { get; set; }
}
