using Merchello.Core.Discounts.Models;

namespace Merchello.Core.Discounts.Services;

/// <summary>
/// Helper class for matching line items against discount target rules.
/// </summary>
public static class DiscountTargetMatcher
{
    /// <summary>
    /// Checks if a line item matches the given target rules.
    /// </summary>
    /// <param name="lineItem">The line item to check.</param>
    /// <param name="rules">The target rules to match against.</param>
    /// <returns>True if the line item matches (included and not excluded).</returns>
    public static bool DoesLineItemMatchTargetRules(DiscountContextLineItem lineItem, List<DiscountTargetRule> rules)
    {
        if (rules.Count == 0)
        {
            // No rules means all products match
            return true;
        }

        var inclusionRules = rules.Where(r => !r.IsExclusion).ToList();
        var exclusionRules = rules.Where(r => r.IsExclusion).ToList();

        // Check exclusions first - if item is excluded, it doesn't match
        foreach (var rule in exclusionRules)
        {
            if (DoesLineItemMatchRule(lineItem, rule))
            {
                return false;
            }
        }

        // If there are no inclusion rules, item matches (not excluded)
        if (inclusionRules.Count == 0)
        {
            return true;
        }

        // Check if item matches any inclusion rule
        foreach (var rule in inclusionRules)
        {
            if (DoesLineItemMatchRule(lineItem, rule))
            {
                return true;
            }
        }

        return false;
    }

    /// <summary>
    /// Gets line items that match the given target rules.
    /// </summary>
    /// <param name="lineItems">The line items to filter.</param>
    /// <param name="rules">The target rules to match against.</param>
    /// <returns>Line items that match the rules.</returns>
    public static List<DiscountContextLineItem> GetMatchingLineItems(
        List<DiscountContextLineItem> lineItems,
        List<DiscountTargetRule> rules)
    {
        if (rules.Count == 0)
        {
            // No rules means all products match
            return lineItems.ToList();
        }

        return lineItems.Where(item => DoesLineItemMatchTargetRules(item, rules)).ToList();
    }

    /// <summary>
    /// Checks if a line item matches a specific rule.
    /// </summary>
    private static bool DoesLineItemMatchRule(DiscountContextLineItem lineItem, DiscountTargetRule rule)
    {
        var targetIds = rule.GetTargetIdsList();

        return rule.TargetType switch
        {
            DiscountTargetType.AllProducts => true,
            DiscountTargetType.SpecificProducts => targetIds.Contains(lineItem.ProductId) ||
                                                   targetIds.Contains(lineItem.ProductRootId),
            DiscountTargetType.Categories => lineItem.CategoryIds.Any(cid => targetIds.Contains(cid)),
            DiscountTargetType.ProductFilters => lineItem.ProductFilterIds.Any(fid => targetIds.Contains(fid)),
            DiscountTargetType.ProductTypes => lineItem.ProductTypeId.HasValue &&
                                               targetIds.Contains(lineItem.ProductTypeId.Value),
            DiscountTargetType.Suppliers => lineItem.SupplierId.HasValue &&
                                            targetIds.Contains(lineItem.SupplierId.Value),
            DiscountTargetType.Warehouses => lineItem.WarehouseId.HasValue &&
                                             targetIds.Contains(lineItem.WarehouseId.Value),
            _ => false
        };
    }

    /// <summary>
    /// Gets the total value of matching line items.
    /// </summary>
    /// <param name="lineItems">The line items to sum.</param>
    /// <param name="rules">The target rules to match against.</param>
    /// <returns>The total value of matching line items.</returns>
    public static decimal GetMatchingLineItemsTotal(
        List<DiscountContextLineItem> lineItems,
        List<DiscountTargetRule> rules)
    {
        var matchingItems = GetMatchingLineItems(lineItems, rules);
        return matchingItems.Sum(item => item.LineTotal);
    }

    /// <summary>
    /// Gets the total quantity of matching line items.
    /// </summary>
    /// <param name="lineItems">The line items to count.</param>
    /// <param name="rules">The target rules to match against.</param>
    /// <returns>The total quantity of matching line items.</returns>
    public static int GetMatchingLineItemsQuantity(
        List<DiscountContextLineItem> lineItems,
        List<DiscountTargetRule> rules)
    {
        var matchingItems = GetMatchingLineItems(lineItems, rules);
        return matchingItems.Sum(item => item.Quantity);
    }
}
