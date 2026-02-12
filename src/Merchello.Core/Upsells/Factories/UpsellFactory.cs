using System.Text.Json;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Upsells.Extensions;
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
            DefaultChecked = parameters.DefaultChecked,
            AutoAddToBasket = parameters.AutoAddToBasket,
            StartsAt = startsAt,
            EndsAt = parameters.EndsAt,
            Timezone = parameters.Timezone,
            CreatedBy = parameters.CreatedBy,
            DateCreated = now,
            DateUpdated = now,
        };

        rule.SetDisplayStyles(UpsellDisplayStylesSanitizer.Sanitize(parameters.DisplayStyles));

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
        var triggerIds = IsCartValueTrigger(parameters.TriggerType)
            ? SerializeCartValueTrigger(parameters)
            : parameters.TriggerIds is { Count: > 0 }
                ? JsonSerializer.Serialize(parameters.TriggerIds)
                : null;

        return new UpsellTriggerRule
        {
            TriggerType = parameters.TriggerType,
            TriggerIds = triggerIds,
            ExtractFilterIds = parameters.ExtractFilterIds is { Count: > 0 }
                ? JsonSerializer.Serialize(parameters.ExtractFilterIds)
                : null,
        };
    }

    private static bool IsCartValueTrigger(UpsellTriggerType triggerType) =>
        triggerType is UpsellTriggerType.MinimumCartValue
            or UpsellTriggerType.MaximumCartValue
            or UpsellTriggerType.CartValueBetween;

    private static string? SerializeCartValueTrigger(CreateUpsellTriggerRuleParameters parameters)
    {
        return parameters.TriggerType switch
        {
            UpsellTriggerType.MinimumCartValue or UpsellTriggerType.MaximumCartValue
                when parameters.Value.HasValue
                => JsonSerializer.Serialize(new { value = parameters.Value.Value }),
            UpsellTriggerType.CartValueBetween
                when parameters.Min.HasValue && parameters.Max.HasValue
                => JsonSerializer.Serialize(new { min = parameters.Min.Value, max = parameters.Max.Value }),
            _ => null
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
