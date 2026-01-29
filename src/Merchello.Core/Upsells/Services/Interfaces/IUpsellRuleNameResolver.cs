using Merchello.Core.Upsells.Dtos;

namespace Merchello.Core.Upsells.Services.Interfaces;

/// <summary>
/// Resolves GUIDs to display names for the admin UI.
/// </summary>
public interface IUpsellRuleNameResolver
{
    Task ResolveTriggerRuleNamesAsync(List<UpsellTriggerRuleDto> rules, CancellationToken ct = default);
    Task ResolveRecommendationRuleNamesAsync(List<UpsellRecommendationRuleDto> rules, CancellationToken ct = default);
    Task ResolveEligibilityRuleNamesAsync(List<UpsellEligibilityRuleDto> rules, CancellationToken ct = default);
}
