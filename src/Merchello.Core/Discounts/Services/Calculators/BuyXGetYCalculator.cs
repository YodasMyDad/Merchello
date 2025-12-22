using Merchello.Core.Accounting.Models;
using Merchello.Core.Discounts.Models;
using Merchello.Core.Discounts.Services.Interfaces;
using Merchello.Core.Shared.Services.Interfaces;

namespace Merchello.Core.Discounts.Services.Calculators;

/// <summary>
/// Calculator for Buy X Get Y discount calculations.
/// </summary>
public class BuyXGetYCalculator(ICurrencyService currencyService) : IBuyXGetYCalculator
{
    /// <inheritdoc />
    public DiscountCalculationResult Calculate(Discount discount, DiscountContext context)
    {
        var result = new DiscountCalculationResult
        {
            Success = true,
            Discount = discount
        };

        var config = discount.BuyXGetYConfig;
        if (config == null)
        {
            return DiscountCalculationResult.Failed("Buy X Get Y configuration is missing.");
        }

        // Step 1: Get qualifying "Buy" items
        var buyTargetRules = CreateTargetRulesFromConfig(config.BuyTargetType, config.GetBuyTargetIdsList());
        var buyItems = DiscountTargetMatcher.GetMatchingLineItems(context.LineItems, buyTargetRules);

        if (buyItems.Count == 0)
        {
            return result; // No qualifying buy items
        }

        // Step 2: Get qualifying "Get" items
        var getTargetRules = CreateTargetRulesFromConfig(config.GetTargetType, config.GetGetTargetIdsList());
        var getItems = DiscountTargetMatcher.GetMatchingLineItems(context.LineItems, getTargetRules);

        if (getItems.Count == 0)
        {
            return result; // No qualifying get items
        }

        // Step 3: Check for overlap between buy and get items
        var buyItemIds = buyItems.Select(b => b.LineItemId).ToHashSet();
        var hasOverlap = getItems.Any(g => buyItemIds.Contains(g.LineItemId));

        // Step 4: Calculate triggers earned, accounting for overlap
        var triggersEarned = CalculateTriggersEarned(buyItems, getItems, config, hasOverlap);
        if (triggersEarned <= 0)
        {
            return result; // Not enough to trigger the discount
        }

        // Step 5: Calculate how many items can be discounted
        var maxDiscountableQuantity = triggersEarned * config.GetQuantity;

        // Apply per-order usage limit if set
        if (discount.PerOrderUsageLimit.HasValue)
        {
            maxDiscountableQuantity = Math.Min(maxDiscountableQuantity,
                discount.PerOrderUsageLimit.Value * config.GetQuantity);
        }

        // Step 6: Get available get items, handling overlap with selection method in mind
        var availableGetItems = GetAvailableGetItems(buyItems, getItems, config, triggersEarned, hasOverlap);
        if (availableGetItems.Count == 0)
        {
            return result; // All get items were used for buy qualification
        }

        // Step 7: Sort items by selection method and apply discount
        var sortedGetItems = SortBySelectionMethod(availableGetItems, config.SelectionMethod);
        var discountedItems = ApplyDiscount(sortedGetItems, maxDiscountableQuantity, config, context.CurrencyCode);

        result.DiscountedLineItems = discountedItems;
        result.ProductDiscountAmount = discountedItems.Sum(i => i.TotalDiscount);
        result.TotalDiscountAmount = result.ProductDiscountAmount;

        return result;
    }

    private int CalculateTriggersEarned(
        List<DiscountContextLineItem> buyItems,
        List<DiscountContextLineItem> getItems,
        DiscountBuyXGetYConfig config,
        bool hasOverlap)
    {
        var rawTriggers = config.BuyTriggerType switch
        {
            BuyXTriggerType.MinimumQuantity =>
                (int)Math.Floor(buyItems.Sum(i => i.Quantity) / config.BuyTriggerValue),
            BuyXTriggerType.MinimumPurchaseAmount =>
                (int)Math.Floor(buyItems.Sum(i => i.LineTotal) / config.BuyTriggerValue),
            _ => 0
        };

        if (!hasOverlap || config.BuyTriggerType != BuyXTriggerType.MinimumQuantity)
        {
            return rawTriggers;
        }

        // When items overlap and using quantity trigger, limit triggers based on available items for "get"
        // Only count items with price > 0 as valid "get" candidates (zero-price items provide no discount benefit)
        var buyItemIds = buyItems.Select(b => b.LineItemId).ToHashSet();
        var overlappingGetItems = getItems.Where(g => buyItemIds.Contains(g.LineItemId)).ToList();
        var nonOverlappingGetItems = getItems.Where(g => !buyItemIds.Contains(g.LineItemId)).ToList();

        var overlappingQty = overlappingGetItems.Sum(i => i.Quantity);
        var overlappingDiscountableQty = overlappingGetItems.Where(i => i.UnitPrice > 0).Sum(i => i.Quantity);
        var nonOverlappingDiscountableQty = nonOverlappingGetItems.Where(i => i.UnitPrice > 0).Sum(i => i.Quantity);

        // For overlapping items: we need buyTriggerValue for buy, the rest can be used for get
        // We need at least 1 discountable item left after buy qualification
        var buyQtyPerTrigger = (int)config.BuyTriggerValue;

        // Calculate max triggers possible from overlapping items
        // Total overlapping items must cover: (triggers * buyQty) for buy, plus at least 1 for get per trigger
        // Note: we don't require full getQuantity, just need at least 1 item to give away
        var maxTriggersFromOverlapTotal = 0;
        if (overlappingQty > buyQtyPerTrigger)
        {
            // Items available after minimum buy for 1 trigger
            var itemsAfterOneBuy = overlappingQty - buyQtyPerTrigger;
            var discountableAfterOneBuy = Math.Min(itemsAfterOneBuy, overlappingDiscountableQty);

            if (discountableAfterOneBuy > 0)
            {
                // We can do at least 1 deal, figure out how many more
                // Each additional trigger needs buyQtyPerTrigger more items
                // Use simple calculation: how many complete deals can we make?
                var itemsPerMinimalDeal = buyQtyPerTrigger + 1; // Minimum: buy qty + at least 1 for get
                maxTriggersFromOverlapTotal = overlappingQty / itemsPerMinimalDeal;

                // But also limited by discountable items available for get
                // After using (maxTriggers * buyQty) for buy, need discountable items left
                for (var t = maxTriggersFromOverlapTotal; t >= 1; t--)
                {
                    var buyNeeded = t * buyQtyPerTrigger;
                    var leftForGet = overlappingQty - buyNeeded;
                    var discountableForGet = Math.Min(leftForGet, overlappingDiscountableQty);
                    if (discountableForGet > 0 && buyNeeded <= overlappingQty)
                    {
                        maxTriggersFromOverlapTotal = t;
                        break;
                    }
                    maxTriggersFromOverlapTotal = t - 1;
                }
            }
        }

        // Non-overlapping discountable get items allow additional triggers if we have extra buy capacity
        var extraTriggersFromBuy = Math.Max(0, rawTriggers - maxTriggersFromOverlapTotal);
        var additionalFromNonOverlapping = nonOverlappingDiscountableQty > 0 ? extraTriggersFromBuy : 0;

        var totalPossibleDeals = maxTriggersFromOverlapTotal + additionalFromNonOverlapping;

        return Math.Min(rawTriggers, Math.Max(totalPossibleDeals, maxTriggersFromOverlapTotal > 0 ? maxTriggersFromOverlapTotal : 0));
    }

    private List<DiscountTargetRule> CreateTargetRulesFromConfig(DiscountTargetType targetType, List<Guid> targetIds)
    {
        if (targetType == DiscountTargetType.AllProducts)
        {
            return [];
        }

        return
        [
            new DiscountTargetRule
            {
                TargetType = targetType,
                TargetIds = System.Text.Json.JsonSerializer.Serialize(targetIds),
                IsExclusion = false
            }
        ];
    }

    private List<DiscountContextLineItem> GetAvailableGetItems(
        List<DiscountContextLineItem> buyItems,
        List<DiscountContextLineItem> getItems,
        DiscountBuyXGetYConfig config,
        int triggersEarned,
        bool hasOverlap)
    {
        if (!hasOverlap)
        {
            // No overlap, return all get items
            return getItems.ToList();
        }

        var buyItemIds = buyItems.Select(b => b.LineItemId).ToHashSet();
        var nonOverlappingItems = getItems.Where(g => !buyItemIds.Contains(g.LineItemId)).ToList();
        var overlappingItems = getItems.Where(g => buyItemIds.Contains(g.LineItemId)).ToList();

        // Calculate how many items need to be reserved for buy qualification
        var buyQuantityNeeded = 0;
        if (config.BuyTriggerType == BuyXTriggerType.MinimumQuantity)
        {
            buyQuantityNeeded = (int)(triggersEarned * config.BuyTriggerValue);
        }

        // Sort overlapping items to determine which to consume for "buy" first (leaving the rest for "get")
        // Key insight: Zero-price items provide no discount benefit for "get", so consume them for buy first.
        // If selecting cheapest for discount: consume zero-price first, then expensive; reserve cheap non-zero for get
        // If selecting most expensive for discount: consume zero-price first, then cheap; reserve expensive for get
        List<DiscountContextLineItem> sortedOverlapping;
        if (config.SelectionMethod == BuyXGetYSelectionMethod.Cheapest)
        {
            // Consume for buy: zero-price first (useless for get), then expensive (reserve cheap non-zero for get)
            sortedOverlapping = overlappingItems
                .OrderBy(i => i.UnitPrice == 0 ? 0 : 1)  // Zero-price items first (consume for buy)
                .ThenByDescending(i => i.UnitPrice)       // Among non-zero, consume expensive first (save cheap for get)
                .ToList();
        }
        else
        {
            // Consume for buy: zero-price first, then cheap; save expensive for get
            sortedOverlapping = overlappingItems
                .OrderBy(i => i.UnitPrice == 0 ? 0 : 1)  // Zero-price items first (consume for buy)
                .ThenBy(i => i.UnitPrice)                 // Among non-zero, consume cheap first (save expensive for get)
                .ToList();
        }

        var adjustedGetItems = new List<DiscountContextLineItem>();
        adjustedGetItems.AddRange(nonOverlappingItems);

        var remainingBuyQuantity = buyQuantityNeeded;
        foreach (var item in sortedOverlapping)
        {
            if (remainingBuyQuantity <= 0)
            {
                // No more buy needed, all remaining items available for get
                adjustedGetItems.Add(item);
                continue;
            }

            var quantityUsedForBuy = Math.Min(item.Quantity, remainingBuyQuantity);
            remainingBuyQuantity -= quantityUsedForBuy;

            var remainingQuantity = item.Quantity - quantityUsedForBuy;
            if (remainingQuantity > 0)
            {
                adjustedGetItems.Add(new DiscountContextLineItem
                {
                    LineItemId = item.LineItemId,
                    ProductId = item.ProductId,
                    ProductRootId = item.ProductRootId,
                    CollectionIds = item.CollectionIds,
                    ProductFilterIds = item.ProductFilterIds,
                    ProductTypeId = item.ProductTypeId,
                    SupplierId = item.SupplierId,
                    WarehouseId = item.WarehouseId,
                    Sku = item.Sku,
                    Quantity = remainingQuantity,
                    UnitPrice = item.UnitPrice,
                    LineTotal = remainingQuantity * item.UnitPrice
                });
            }
        }

        return adjustedGetItems;
    }

    private List<DiscountContextLineItem> SortBySelectionMethod(
        List<DiscountContextLineItem> items,
        BuyXGetYSelectionMethod method)
    {
        return method switch
        {
            BuyXGetYSelectionMethod.Cheapest => items.OrderBy(i => i.UnitPrice).ToList(),
            BuyXGetYSelectionMethod.MostExpensive => items.OrderByDescending(i => i.UnitPrice).ToList(),
            _ => items
        };
    }

    private List<DiscountedLineItem> ApplyDiscount(
        List<DiscountContextLineItem> sortedItems,
        int maxDiscountableQuantity,
        DiscountBuyXGetYConfig config,
        string currencyCode)
    {
        var discountedItems = new List<DiscountedLineItem>();
        var remainingQuantityToDiscount = maxDiscountableQuantity;

        foreach (var item in sortedItems)
        {
            if (remainingQuantityToDiscount <= 0)
            {
                break;
            }

            // Skip zero-priced items (no benefit to discount)
            if (item.UnitPrice <= 0)
            {
                continue;
            }

            var quantityToDiscount = Math.Min(item.Quantity, remainingQuantityToDiscount);
            remainingQuantityToDiscount -= quantityToDiscount;

            // Calculate discount per unit based on value type
            decimal discountPerUnit;
            if (config.GetValueType == DiscountValueType.Percentage)
            {
                discountPerUnit = currencyService.Round(item.UnitPrice * (config.GetValue / 100m), currencyCode);
            }
            else if (config.GetValueType == DiscountValueType.FixedAmount)
            {
                // Fixed amount cannot exceed item price
                discountPerUnit = Math.Min(config.GetValue, item.UnitPrice);
            }
            else // Free
            {
                discountPerUnit = item.UnitPrice;
            }

            var totalDiscount = currencyService.Round(discountPerUnit * quantityToDiscount, currencyCode);

            discountedItems.Add(new DiscountedLineItem
            {
                LineItemId = item.LineItemId,
                ProductId = item.ProductId,
                DiscountedQuantity = quantityToDiscount,
                DiscountPerUnit = discountPerUnit,
                TotalDiscount = totalDiscount,
                OriginalUnitPrice = item.UnitPrice,
                DiscountedUnitPrice = item.UnitPrice - discountPerUnit
            });
        }

        return discountedItems;
    }
}
