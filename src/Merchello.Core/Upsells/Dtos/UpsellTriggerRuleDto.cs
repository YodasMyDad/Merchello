using Merchello.Core.Upsells.Models;

namespace Merchello.Core.Upsells.Dtos;

/// <summary>
/// Trigger rule with resolved display names for the admin UI.
/// </summary>
public class UpsellTriggerRuleDto
{
    public UpsellTriggerType TriggerType { get; set; }
    public List<Guid>? TriggerIds { get; set; }
    public List<string>? TriggerNames { get; set; }
    public List<Guid>? ExtractFilterIds { get; set; }
    public List<string>? ExtractFilterNames { get; set; }
}
