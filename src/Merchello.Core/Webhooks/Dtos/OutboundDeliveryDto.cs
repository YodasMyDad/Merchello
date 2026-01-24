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
    public string StatusCssClass { get; set; } = string.Empty;
    public int? ResponseStatusCode { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime DateCreated { get; set; }
    public DateTime? DateCompleted { get; set; }
    public int DurationMs { get; set; }
    public int AttemptNumber { get; set; }
}
