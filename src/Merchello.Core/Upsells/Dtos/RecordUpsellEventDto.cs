using Merchello.Core.Upsells.Models;

namespace Merchello.Core.Upsells.Dtos;

/// <summary>
/// Single upsell event for storefront tracking.
/// </summary>
public class RecordUpsellEventDto
{
    public Guid UpsellRuleId { get; set; }
    public UpsellEventType EventType { get; set; }
    public Guid? ProductId { get; set; }
    public UpsellDisplayLocation DisplayLocation { get; set; }
}
