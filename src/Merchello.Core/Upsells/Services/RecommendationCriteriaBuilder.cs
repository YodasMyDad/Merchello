namespace Merchello.Core.Upsells.Services;

internal sealed class RecommendationCriteriaBuilder
{
    public HashSet<Guid> Ids { get; } = [];
    public bool RequiresPopularity { get; set; }
}
