using Merchello.Core.Upsells.Models;

namespace Merchello.Core.Upsells.Services;

internal sealed record RecommendationCriteria(
    UpsellRecommendationType Type,
    List<Guid> Ids,
    bool RequiresPopularity);
