using Merchello.Core.Upsells.Models;

namespace Merchello.Core.Upsells.Dtos;

/// <summary>
/// Create recommendation rule within a create/update upsell request.
/// </summary>
public class CreateUpsellRecommendationRuleDto
{
    public UpsellRecommendationType RecommendationType { get; set; }
    public List<Guid>? RecommendationIds { get; set; }
    public bool MatchTriggerFilters { get; set; }
    public List<Guid>? MatchFilterIds { get; set; }
}
