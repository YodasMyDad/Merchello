using Merchello.Core.Upsells.Models;

namespace Merchello.Core.Upsells.Dtos;

/// <summary>
/// Create trigger rule within a create/update upsell request.
/// </summary>
public class CreateUpsellTriggerRuleDto
{
    public UpsellTriggerType TriggerType { get; set; }
    public List<Guid>? TriggerIds { get; set; }
    public List<Guid>? ExtractFilterIds { get; set; }
}
