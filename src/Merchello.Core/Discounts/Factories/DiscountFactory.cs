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
            CurrentUsageCount = 0,
            RequirementType = parameters.RequirementType,
            RequirementValue = parameters.RequirementValue,
            CanCombineWithProductDiscounts = parameters.CanCombineWithProductDiscounts,
            CanCombineWithOrderDiscounts = parameters.CanCombineWithOrderDiscounts,
            CanCombineWithShippingDiscounts = parameters.CanCombineWithShippingDiscounts,
            Priority = parameters.Priority,
            CreatedBy = parameters.CreatedBy,
            DateCreated = now,
            DateUpdated = now,
            TargetRules = [],
            EligibilityRules = [],
            Usages = []
        };
    }

    /// <summary>
    /// Creates a new DiscountTargetRule.
    /// </summary>
    public DiscountTargetRule CreateTargetRule(
        Guid discountId,
        DiscountTargetType targetType,
        List<Guid>? targetIds,
        bool isExclusion = false)
    {
        return new DiscountTargetRule
        {
            Id = GuidExtensions.NewSequentialGuid,
            DiscountId = discountId,
            TargetType = targetType,
            TargetIds = targetIds != null && targetIds.Count > 0
                ? JsonSerializer.Serialize(targetIds)
                : null,
            IsExclusion = isExclusion
        };
    }

    /// <summary>
    /// Creates a new DiscountTargetRule from parameters.
    /// </summary>
    public DiscountTargetRule CreateTargetRule(Guid discountId, CreateDiscountTargetRuleParameters parameters)
    {
        return CreateTargetRule(
            discountId,
            parameters.TargetType,
            parameters.TargetIds,
            parameters.IsExclusion);
    }

    /// <summary>
    /// Creates a new DiscountEligibilityRule.
    /// </summary>
    public DiscountEligibilityRule CreateEligibilityRule(
        Guid discountId,
        DiscountEligibilityType eligibilityType,
        List<Guid>? eligibilityIds)
    {
        return new DiscountEligibilityRule
        {
            Id = GuidExtensions.NewSequentialGuid,
            DiscountId = discountId,
            EligibilityType = eligibilityType,
            EligibilityIds = eligibilityIds != null && eligibilityIds.Count > 0
                ? JsonSerializer.Serialize(eligibilityIds)
                : null
        };
    }

    /// <summary>
    /// Creates a new DiscountEligibilityRule from parameters.
    /// </summary>
    public DiscountEligibilityRule CreateEligibilityRule(Guid discountId, CreateDiscountEligibilityRuleParameters parameters)
    {
        return CreateEligibilityRule(
            discountId,
            parameters.EligibilityType,
            parameters.EligibilityIds);
    }

    /// <summary>
    /// Creates a new DiscountBuyXGetYConfig from parameters.
    /// </summary>
    public DiscountBuyXGetYConfig CreateBuyXGetYConfig(Guid discountId, CreateBuyXGetYParameters parameters)
    {
        return new DiscountBuyXGetYConfig
        {
            Id = GuidExtensions.NewSequentialGuid,
            DiscountId = discountId,
            BuyTriggerType = parameters.BuyTriggerType,
            BuyTriggerValue = parameters.BuyTriggerValue,
            BuyTargetType = parameters.BuyTargetType,
            BuyTargetIds = parameters.BuyTargetIds != null && parameters.BuyTargetIds.Count > 0
                ? JsonSerializer.Serialize(parameters.BuyTargetIds)
                : null,
            GetQuantity = parameters.GetQuantity,
            GetTargetType = parameters.GetTargetType,
            GetTargetIds = parameters.GetTargetIds != null && parameters.GetTargetIds.Count > 0
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
    public DiscountFreeShippingConfig CreateFreeShippingConfig(Guid discountId, CreateFreeShippingParameters parameters)
    {
        return new DiscountFreeShippingConfig
        {
            Id = GuidExtensions.NewSequentialGuid,
            DiscountId = discountId,
            CountryScope = parameters.CountryScope,
            CountryCodes = parameters.CountryCodes != null && parameters.CountryCodes.Count > 0
                ? JsonSerializer.Serialize(parameters.CountryCodes)
                : null,
            ExcludeRatesOverAmount = parameters.ExcludeRatesOverAmount,
            ExcludeRatesOverValue = parameters.ExcludeRatesOverValue,
            AllowedShippingOptionIds = parameters.AllowedShippingOptionIds != null && parameters.AllowedShippingOptionIds.Count > 0
                ? JsonSerializer.Serialize(parameters.AllowedShippingOptionIds)
                : null
        };
    }

    /// <summary>
    /// Creates a new DiscountUsage record.
    /// </summary>
    public DiscountUsage CreateUsage(
        Guid discountId,
        Guid invoiceId,
        Guid? customerId,
        decimal discountAmount,
        decimal discountAmountInStoreCurrency,
        string currencyCode)
    {
        return new DiscountUsage
        {
            Id = GuidExtensions.NewSequentialGuid,
            DiscountId = discountId,
            InvoiceId = invoiceId,
            CustomerId = customerId,
            DiscountAmount = discountAmount,
            DiscountAmountInStoreCurrency = discountAmountInStoreCurrency,
            CurrencyCode = currencyCode,
            DateUsed = DateTime.UtcNow
        };
    }
}
