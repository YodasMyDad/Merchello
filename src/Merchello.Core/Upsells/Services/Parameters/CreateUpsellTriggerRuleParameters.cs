using Merchello.Core.Upsells.Models;

namespace Merchello.Core.Upsells.Services.Parameters;

/// <summary>
/// Parameters for creating an upsell trigger rule.
/// </summary>
public class CreateUpsellTriggerRuleParameters
{
    public UpsellTriggerType TriggerType { get; set; }
    public List<Guid>? TriggerIds { get; set; }
    public List<Guid>? ExtractFilterIds { get; set; }
}
