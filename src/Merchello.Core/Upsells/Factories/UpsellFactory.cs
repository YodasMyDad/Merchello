using System.Text.Json;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Upsells.Models;
using Merchello.Core.Upsells.Services.Parameters;

namespace Merchello.Core.Upsells.Factories;

/// <summary>
/// Creates upsell domain objects. Follows the DiscountFactory pattern.
/// </summary>
public class UpsellFactory
{
    /// <summary>
    /// Creates a new UpsellRule from parameters.
    /// Status is always Draft — activation is explicit via ActivateAsync().
    /// </summary>
    public UpsellRule Create(CreateUpsellParameters parameters)
    {
        var now = DateTime.UtcNow;
        var startsAt = parameters.StartsAt ?? now;

        var status = startsAt > now ? UpsellStatus.Scheduled : UpsellStatus.Draft;

        var rule = new UpsellRule
        {
            Id = GuidExtensions.NewSequentialGuid,
            Name = parameters.Name.Trim(),
            Description = parameters.Description?.Trim(),
            Status = status,
            Heading = parameters.Heading.Trim(),
            Message = parameters.Message?.Trim(),
            Priority = parameters.Priority,
            MaxProducts = parameters.MaxProducts,
            SortBy = parameters.SortBy,
            SuppressIfInCart = parameters.SuppressIfInCart,
            DisplayLocation = parameters.DisplayLocation,
            CheckoutMode = parameters.CheckoutMode,
            StartsAt = startsAt,
            EndsAt = parameters.EndsAt,
            Timezone = parameters.Timezone,
            CreatedBy = parameters.CreatedBy,
            DateCreated = now,
            DateUpdated = now,
        };

        if (parameters.TriggerRules is { Count: > 0 })
        {
            var triggerRules = parameters.TriggerRules
                .Select(CreateTriggerRule)
                .ToList();
            rule.SetTriggerRules(triggerRules);
        }

        if (parameters.RecommendationRules is { Count: > 0 })
        {
            var recommendationRules = parameters.RecommendationRules
                .Select(CreateRecommendationRule)
                .ToList();
            rule.SetRecommendationRules(recommendationRules);
        }

        if (parameters.EligibilityRules is { Count: > 0 })
        {
            var eligibilityRules = parameters.EligibilityRules
                .Select(CreateEligibilityRule)
                .ToList();
            rule.SetEligibilityRules(eligibilityRules);
        }

        return rule;
    }

    /// <summary>
    /// Creates a trigger rule POCO for JSON serialization.
    /// </summary>
    public UpsellTriggerRule CreateTriggerRule(CreateUpsellTriggerRuleParameters parameters)
    {
        return new UpsellTriggerRule
        {
            TriggerType = parameters.TriggerType,
            TriggerIds = parameters.TriggerIds is { Count: > 0 }
                ? JsonSerializer.Serialize(parameters.TriggerIds)
                : null,
            ExtractFilterIds = parameters.ExtractFilterIds is { Count: > 0 }
                ? JsonSerializer.Serialize(parameters.ExtractFilterIds)
                : null,
        };
    }

    /// <summary>
    /// Creates a recommendation rule POCO for JSON serialization.
    /// </summary>
    public UpsellRecommendationRule CreateRecommendationRule(CreateUpsellRecommendationRuleParameters parameters)
    {
        return new UpsellRecommendationRule
        {
            RecommendationType = parameters.RecommendationType,
            RecommendationIds = parameters.RecommendationIds is { Count: > 0 }
                ? JsonSerializer.Serialize(parameters.RecommendationIds)
                : null,
            MatchTriggerFilters = parameters.MatchTriggerFilters,
            MatchFilterIds = parameters.MatchFilterIds is { Count: > 0 }
                ? JsonSerializer.Serialize(parameters.MatchFilterIds)
                : null,
        };
    }

    /// <summary>
    /// Creates an eligibility rule POCO for JSON serialization.
    /// </summary>
    public UpsellEligibilityRule CreateEligibilityRule(CreateUpsellEligibilityRuleParameters parameters)
    {
        return new UpsellEligibilityRule
        {
            EligibilityType = parameters.EligibilityType,
            EligibilityIds = parameters.EligibilityIds is { Count: > 0 }
                ? JsonSerializer.Serialize(parameters.EligibilityIds)
                : null,
        };
    }
}
