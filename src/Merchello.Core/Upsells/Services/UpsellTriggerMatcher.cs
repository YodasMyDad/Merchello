using Merchello.Core.Upsells.Models;

namespace Merchello.Core.Upsells.Services;

/// <summary>
/// Static utility for matching basket line items against upsell trigger rules.
/// Follows the DiscountTargetMatcher pattern.
/// </summary>
public static class UpsellTriggerMatcher
{
    /// <summary>
    /// Returns true if any line item matches any trigger rule.
    /// </summary>
    public static bool DoesBasketMatchTriggerRules(
        List<UpsellContextLineItem> lineItems,
        List<UpsellTriggerRule> rules)
    {
        if (lineItems.Count == 0 || rules.Count == 0)
            return false;

        return rules.Any(rule => DoesAnyLineItemMatchRule(lineItems, rule));
    }

    /// <summary>
    /// Gets line items that match the given trigger rules.
    /// </summary>
    public static List<UpsellContextLineItem> GetMatchingLineItems(
        List<UpsellContextLineItem> lineItems,
        List<UpsellTriggerRule> rules)
    {
        if (lineItems.Count == 0 || rules.Count == 0)
            return [];

        return lineItems
            .Where(li => rules.Any(rule => DoesLineItemMatchRule(li, rule)))
            .ToList();
    }

    /// <summary>
    /// Extracts filter values from matching line items based on ExtractFilterGroupIds.
    /// Returns Dictionary of FilterGroupId -> Set of FilterIds found on matching products.
    /// </summary>
    public static Dictionary<Guid, HashSet<Guid>> ExtractFilterValues(
        List<UpsellContextLineItem> matchingLineItems,
        List<UpsellTriggerRule> rules)
    {
        var extracted = new Dictionary<Guid, HashSet<Guid>>();

        foreach (var rule in rules)
        {
            var filterGroupIds = rule.GetExtractFilterGroupIdsList();
            if (filterGroupIds.Count == 0) continue;

            foreach (var lineItem in matchingLineItems)
            {
                foreach (var filterGroupId in filterGroupIds)
                {
                    if (!lineItem.FiltersByGroup.TryGetValue(filterGroupId, out var filterIds))
                        continue;

                    if (!extracted.TryGetValue(filterGroupId, out var existingSet))
                    {
                        existingSet = [];
                        extracted[filterGroupId] = existingSet;
                    }

                    foreach (var filterId in filterIds)
                        existingSet.Add(filterId);
                }
            }
        }

        return extracted;
    }

    /// <summary>
    /// Checks if the basket meets a cart value trigger condition.
    /// </summary>
    public static bool DoesBasketMatchCartValueTrigger(
        List<UpsellContextLineItem> lineItems,
        UpsellTriggerRule rule)
    {
        if (!IsCartValueTrigger(rule.TriggerType))
            return false;

        var cartTotal = lineItems.Sum(li => li.UnitPrice * li.Quantity);
        var triggerValue = ParseCartValueFromTriggerIds(rule.TriggerIds);

        return rule.TriggerType switch
        {
            UpsellTriggerType.MinimumCartValue => cartTotal >= triggerValue.Value,
            UpsellTriggerType.MaximumCartValue => cartTotal <= triggerValue.Value,
            UpsellTriggerType.CartValueBetween => cartTotal >= triggerValue.Min && cartTotal <= triggerValue.Max,
            _ => false
        };
    }

    private static bool DoesAnyLineItemMatchRule(List<UpsellContextLineItem> lineItems, UpsellTriggerRule rule)
    {
        if (IsCartValueTrigger(rule.TriggerType))
            return DoesBasketMatchCartValueTrigger(lineItems, rule);

        return lineItems.Any(li => DoesLineItemMatchRule(li, rule));
    }

    private static bool DoesLineItemMatchRule(UpsellContextLineItem lineItem, UpsellTriggerRule rule)
    {
        if (IsCartValueTrigger(rule.TriggerType))
            return false; // Cart value triggers don't match individual line items

        var targetIds = rule.GetTriggerIdsList();
        if (targetIds.Count == 0) return false;

        return rule.TriggerType switch
        {
            UpsellTriggerType.ProductTypes =>
                lineItem.ProductTypeId.HasValue && targetIds.Contains(lineItem.ProductTypeId.Value),
            UpsellTriggerType.ProductFilters =>
                lineItem.ProductFilterIds.Any(fid => targetIds.Contains(fid)),
            UpsellTriggerType.Collections =>
                lineItem.CollectionIds.Any(cid => targetIds.Contains(cid)),
            UpsellTriggerType.SpecificProducts =>
                targetIds.Contains(lineItem.ProductId) || targetIds.Contains(lineItem.ProductRootId),
            UpsellTriggerType.Suppliers =>
                lineItem.SupplierId.HasValue && targetIds.Contains(lineItem.SupplierId.Value),
            _ => false
        };
    }

    private static bool IsCartValueTrigger(UpsellTriggerType triggerType) =>
        triggerType is UpsellTriggerType.MinimumCartValue
            or UpsellTriggerType.MaximumCartValue
            or UpsellTriggerType.CartValueBetween;

    private static (decimal Value, decimal Min, decimal Max) ParseCartValueFromTriggerIds(string? triggerIds)
    {
        if (string.IsNullOrEmpty(triggerIds))
            return (0, 0, 0);

        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(triggerIds);
            var root = doc.RootElement;

            if (root.TryGetProperty("min", out var minProp) && root.TryGetProperty("max", out var maxProp))
                return (0, minProp.GetDecimal(), maxProp.GetDecimal());

            if (root.TryGetProperty("value", out var valueProp))
                return (valueProp.GetDecimal(), 0, 0);
        }
        catch
        {
            // Swallow parse errors
        }

        return (0, 0, 0);
    }
}
