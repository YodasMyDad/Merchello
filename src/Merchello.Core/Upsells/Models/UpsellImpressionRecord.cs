namespace Merchello.Core.Upsells.Models;

/// <summary>
/// Record stored for upsell impression tracking (used for conversion attribution).
/// </summary>
public class UpsellImpressionRecord
{
    public Guid UpsellRuleId { get; set; }
    public List<Guid> ProductIds { get; set; } = [];
    public UpsellDisplayLocation DisplayLocation { get; set; }
    public DateTime Timestamp { get; set; }
}
