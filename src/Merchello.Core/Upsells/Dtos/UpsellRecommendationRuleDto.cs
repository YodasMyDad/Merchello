using Merchello.Core.Upsells.Models;

namespace Merchello.Core.Upsells.Dtos;

/// <summary>
/// Recommendation rule with resolved display names for the admin UI.
/// </summary>
public class UpsellRecommendationRuleDto
{
    public UpsellRecommendationType RecommendationType { get; set; }
    public List<Guid>? RecommendationIds { get; set; }
    public List<string>? RecommendationNames { get; set; }
    public bool MatchTriggerFilters { get; set; }
    public List<Guid>? MatchFilterGroupIds { get; set; }
    public List<string>? MatchFilterGroupNames { get; set; }
}
