using Merchello.Core.Discounts.Dtos;

namespace Merchello.Core.Discounts.Services.Interfaces;

/// <summary>
/// Resolves display names for discount rule target and eligibility IDs.
/// </summary>
public interface IDiscountRuleNameResolver
{
    /// <summary>
    /// Resolves names for target rule IDs based on target type.
    /// </summary>
    Task ResolveTargetRuleNamesAsync(List<DiscountTargetRuleDto> rules, CancellationToken ct = default);

    /// <summary>
    /// Resolves names for eligibility rule IDs based on eligibility type.
    /// </summary>
    Task ResolveEligibilityRuleNamesAsync(List<DiscountEligibilityRuleDto> rules, CancellationToken ct = default);
}
