using Merchello.Core.Upsells.Models;

namespace Merchello.Core.Upsells.Services.Parameters;

/// <summary>
/// Parameters for creating an upsell recommendation rule.
/// </summary>
public class CreateUpsellRecommendationRuleParameters
{
    public UpsellRecommendationType RecommendationType { get; set; }
    public List<Guid>? RecommendationIds { get; set; }
    public bool MatchTriggerFilters { get; set; }
    public List<Guid>? MatchFilterIds { get; set; }
}
