using Merchello.Core.Upsells.Models;

namespace Merchello.Core.Upsells.Services.Parameters;

/// <summary>
/// Parameters for recording an upsell impression or click event.
/// </summary>
public class RecordUpsellEventParameters
{
    public Guid UpsellRuleId { get; set; }
    public UpsellEventType EventType { get; set; }
    public Guid? ProductId { get; set; }
    public Guid? BasketId { get; set; }
    public Guid? CustomerId { get; set; }
    public UpsellDisplayLocation DisplayLocation { get; set; }
}
