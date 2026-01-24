using System.Text.Json;
using Merchello.Core.Discounts.Models;
using Merchello.Core.Discounts.Services.Parameters;
using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Discounts.Factories;

/// <summary>
/// Factory for creating Discount and related entity instances.
/// </summary>
public class DiscountFactory
{
    /// <summary>
    /// Creates a new Discount from parameters.
    /// </summary>
    public Discount Create(CreateDiscountParameters parameters)
    {
        var now = DateTime.UtcNow;
        var startsAt = parameters.StartsAt ?? now;

        // Determine initial status based on scheduling
        var status = startsAt > now ? DiscountStatus.Scheduled : DiscountStatus.Active;

        return new Discount
        {
            Id = GuidExtensions.NewSequentialGuid,
            Name = parameters.Name.Trim(),
            Description = parameters.Description?.Trim(),
            Status = status,
            Category = parameters.Category,
            Method = parameters.Method,
            Code = parameters.Method == DiscountMethod.Code
                ? parameters.Code?.Trim().ToUpperInvariant()
                : null,
            ValueType = parameters.ValueType,
            Value = parameters.Value,
            StartsAt = startsAt,
            EndsAt = parameters.EndsAt,
            Timezone = parameters.Timezone,
            TotalUsageLimit = parameters.TotalUsageLimit,
            PerCustomerUsageLimit = parameters.PerCustomerUsageLimit,
            PerOrderUsageLimit = parameters.PerOrderUsageLimit,
            RequirementType = parameters.RequirementType,
            RequirementValue = parameters.RequirementValue,
            CanCombineWithProductDiscounts = parameters.CanCombineWithProductDiscounts,
            CanCombineWithOrderDiscounts = parameters.CanCombineWithOrderDiscounts,
            CanCombineWithShippingDiscounts = parameters.CanCombineWithShippingDiscounts,
            ApplyAfterTax = parameters.ApplyAfterTax,
            Priority = parameters.Priority,
            CreatedBy = parameters.CreatedBy,
            DateCreated = now,
            DateUpdated = now
        };
    }

    /// <summary>
    /// Creates a new DiscountTargetRule.
    /// </summary>
    public DiscountTargetRule CreateTargetRule(
        DiscountTargetType targetType,
        List<Guid>? targetIds,
        bool isExclusion = false)
    {
        return new DiscountTargetRule
        {
            TargetType = targetType,
            TargetIds = targetIds is { Count: > 0 }
                ? JsonSerializer.Serialize(targetIds)
                : null,
            IsExclusion = isExclusion
        };
    }

    /// <summary>
    /// Creates a new DiscountTargetRule from parameters.
    /// </summary>
    public DiscountTargetRule CreateTargetRule(CreateDiscountTargetRuleParameters parameters)
    {
        return CreateTargetRule(
            parameters.TargetType,
            parameters.TargetIds,
            parameters.IsExclusion);
    }

    /// <summary>
    /// Creates a new DiscountEligibilityRule.
    /// </summary>
    public DiscountEligibilityRule CreateEligibilityRule(
        DiscountEligibilityType eligibilityType,
        List<Guid>? eligibilityIds)
    {
        return new DiscountEligibilityRule
        {
            EligibilityType = eligibilityType,
            EligibilityIds = eligibilityIds is { Count: > 0 }
                ? JsonSerializer.Serialize(eligibilityIds)
                : null
        };
    }

    /// <summary>
    /// Creates a new DiscountEligibilityRule from parameters.
    /// </summary>
    public DiscountEligibilityRule CreateEligibilityRule(CreateDiscountEligibilityRuleParameters parameters)
    {
        return CreateEligibilityRule(
            parameters.EligibilityType,
            parameters.EligibilityIds);
    }

    /// <summary>
    /// Creates a new DiscountBuyXGetYConfig from parameters.
    /// </summary>
    public DiscountBuyXGetYConfig CreateBuyXGetYConfig(CreateBuyXGetYParameters parameters)
    {
        return new DiscountBuyXGetYConfig
        {
            BuyTriggerType = parameters.BuyTriggerType,
            BuyTriggerValue = parameters.BuyTriggerValue,
            BuyTargetType = parameters.BuyTargetType,
            BuyTargetIds = parameters.BuyTargetIds is { Count: > 0 }
                ? JsonSerializer.Serialize(parameters.BuyTargetIds)
                : null,
            GetQuantity = parameters.GetQuantity,
            GetTargetType = parameters.GetTargetType,
            GetTargetIds = parameters.GetTargetIds is { Count: > 0 }
                ? JsonSerializer.Serialize(parameters.GetTargetIds)
                : null,
            GetValueType = parameters.GetValueType,
            GetValue = parameters.GetValue,
            SelectionMethod = parameters.SelectionMethod
        };
    }

    /// <summary>
    /// Creates a new DiscountFreeShippingConfig from parameters.
    /// </summary>
    public DiscountFreeShippingConfig CreateFreeShippingConfig(CreateFreeShippingParameters parameters)
    {
        return new DiscountFreeShippingConfig
        {
            CountryScope = parameters.CountryScope,
            CountryCodes = parameters.CountryCodes is { Count: > 0 }
                ? JsonSerializer.Serialize(parameters.CountryCodes)
                : null,
            ExcludeRatesOverAmount = parameters.ExcludeRatesOverAmount,
            ExcludeRatesOverValue = parameters.ExcludeRatesOverValue,
            AllowedShippingOptionIds = parameters.AllowedShippingOptionIds is { Count: > 0 }
                ? JsonSerializer.Serialize(parameters.AllowedShippingOptionIds)
                : null
        };
    }
}
