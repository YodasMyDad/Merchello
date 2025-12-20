using Merchello.Core.Accounting.Extensions;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Shared.Services.Interfaces;

namespace Merchello.Core.Accounting.Services;

public class LineItemService(ICurrencyService currencyService) : ILineItemService
{
    public List<string> AddLineItem(List<LineItem> currentLineItems, LineItem newLineItem)
    {
        var errors = newLineItem.ValidateLineItem();
        if (errors.Any())
        {
            return errors;
        }

        var sameLineItem =
            currentLineItems.FirstOrDefault(x =>
                x.Sku == newLineItem.Sku && newLineItem.LineItemType == x.LineItemType);

        if (sameLineItem != null)
        {
            newLineItem.Quantity += sameLineItem.Quantity;

            foreach (var extendedDataEntry in sameLineItem.ExtendedData)
            {
                newLineItem.ExtendedData.TryAdd(extendedDataEntry.Key, extendedDataEntry.Value);
            }

            newLineItem.Id = sameLineItem.Id;
            currentLineItems.RemoveAll(x => x.Id == sameLineItem.Id);
            currentLineItems.Add(newLineItem);
        }
        else
        {
            currentLineItems.Add(newLineItem);
        }

        return errors;
    }

    public (decimal subTotal, decimal discount, decimal adjustedSubTotal, decimal tax, decimal total, decimal shipping)
        CalculateFromLineItems(
            List<LineItem> lineItems,
            decimal shippingAmount,
            decimal defaultTaxRate,
            string currencyCode,
            bool isShippingTaxable = true)
    {
        // Separate product/custom items from discount items
        var productItems = lineItems.Where(li =>
            li.LineItemType == LineItemType.Product ||
            li.LineItemType == LineItemType.Custom).ToList();

        var discountItems = lineItems.Where(li => li.LineItemType == LineItemType.Discount).ToList();

        // Calculate subtotal from products/custom items
        var subTotal = productItems.Sum(li =>
            currencyService.Round(li.Amount * li.Quantity, currencyCode));

        // Get taxable items (needed for after-tax discount calculations)
        var taxableItems = productItems.Where(li => li.IsTaxable).ToList();

        // Separate before-tax and after-tax discounts
        var beforeTaxDiscounts = discountItems.Where(d => !IsAfterTaxDiscount(d)).ToList();
        var afterTaxDiscounts = discountItems.Where(d => IsAfterTaxDiscount(d)).ToList();

        // Process before-tax discount items first
        decimal totalDiscountAmount = 0;
        foreach (var discount in beforeTaxDiscounts)
        {
            var discountAmount = discount.Amount; // Already negative for fixed amounts

            // Check if this is a percentage or free discount (stored in ExtendedData)
            if (discount.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountValueType, out var typeObj))
            {
                var typeStr = typeObj switch
                {
                    string s => s,
                    System.Text.Json.JsonElement je when je.ValueKind == System.Text.Json.JsonValueKind.String => je.GetString(),
                    _ => null
                };

                if (typeStr == nameof(DiscountValueType.Percentage) &&
                    discount.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountValue, out var valueObj))
                {
                    var percentageValue = valueObj switch
                    {
                        decimal dec => dec,
                        double dbl => (decimal)dbl,
                        int i => i,
                        long l => l,
                        string s when decimal.TryParse(s, out var parsed) => parsed,
                        System.Text.Json.JsonElement je when je.ValueKind == System.Text.Json.JsonValueKind.Number =>
                            je.TryGetDecimal(out var d) ? d : 0,
                        _ => 0m
                    };

                    // Calculate percentage of relevant base
                    if (!string.IsNullOrEmpty(discount.DependantLineItemSku))
                    {
                        // Linked to specific product - calculate percentage of that product's total
                        var linkedItem = productItems.FirstOrDefault(p => p.Sku == discount.DependantLineItemSku);
                        if (linkedItem != null)
                        {
                            var linkedTotal = currencyService.Round(linkedItem.Amount * linkedItem.Quantity, currencyCode);
                            discountAmount = -currencyService.Round(linkedTotal * (percentageValue / 100m), currencyCode);
                        }
                    }
                    else
                    {
                        // Order-level percentage - calculate percentage of subtotal
                        discountAmount = -currencyService.Round(subTotal * (percentageValue / 100m), currencyCode);
                    }
                }
                else if (typeStr == nameof(DiscountValueType.Free))
                {
                    // Free means 100% off the linked item
                    if (!string.IsNullOrEmpty(discount.DependantLineItemSku))
                    {
                        var linkedItem = productItems.FirstOrDefault(p => p.Sku == discount.DependantLineItemSku);
                        if (linkedItem != null)
                        {
                            var linkedTotal = currencyService.Round(linkedItem.Amount * linkedItem.Quantity, currencyCode);
                            discountAmount = -linkedTotal;
                        }
                    }
                    else
                    {
                        // Order-level free - full subtotal off (unusual but supported)
                        discountAmount = -subTotal;
                    }
                }
            }

            totalDiscountAmount += discountAmount; // discountAmount is negative
        }

        // Process after-tax discounts - these need reverse calculation
        // After-tax discounts are based on the after-tax total AFTER before-tax discounts are applied
        foreach (var discount in afterTaxDiscounts)
        {
            // Calculate what the after-tax discount amount should be
            // Pass the current total before-tax discount so after-tax is calculated on the remaining amount
            var afterTaxDiscountAmount = CalculateAfterTaxDiscountAmount(
                discount, productItems, taxableItems, subTotal, totalDiscountAmount, currencyCode);

            // Determine which items this discount applies to for reverse calculation
            List<LineItem> applicableItems;
            if (!string.IsNullOrEmpty(discount.DependantLineItemSku))
            {
                // Linked to specific product
                var linkedItem = productItems.FirstOrDefault(p => p.Sku == discount.DependantLineItemSku);
                applicableItems = linkedItem != null && linkedItem.IsTaxable
                    ? [linkedItem]
                    : [];
            }
            else
            {
                // Order-level - applies to all taxable items
                applicableItems = taxableItems;
            }

            // Reverse-calculate the pre-tax discount amount
            var preTaxDiscount = ReverseCalculatePreTaxDiscount(
                afterTaxDiscountAmount, applicableItems, currencyCode);

            // Cap at subtotal to prevent negative totals
            preTaxDiscount = Math.Min(preTaxDiscount, subTotal + totalDiscountAmount);

            totalDiscountAmount -= preTaxDiscount; // Subtract (makes it more negative)
        }

        // Adjusted subtotal (discount is negative so we add it)
        var adjustedSubTotal = currencyService.Round(subTotal + totalDiscountAmount, currencyCode);
        adjustedSubTotal = Math.Max(0, adjustedSubTotal); // Ensure non-negative

        // Separate linked vs unlinked discounts for tax calculation (only before-tax discounts)
        var linkedDiscounts = beforeTaxDiscounts.Where(d => !string.IsNullOrEmpty(d.DependantLineItemSku)).ToList();
        var unlinkedBeforeTaxDiscountTotal = CalculateUnlinkedDiscountTotal(beforeTaxDiscounts, subTotal, currencyCode);

        // Calculate after-tax discount contribution per item for tax calculation
        // Use the before-tax discount total that was calculated earlier
        var beforeTaxDiscountOnly = beforeTaxDiscounts.Sum(d =>
        {
            // Recalculate before-tax discount amounts (same logic as above)
            var discountAmount = d.Amount;
            if (d.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountValueType, out var typeObj))
            {
                var typeStr = typeObj switch
                {
                    string s => s,
                    System.Text.Json.JsonElement je when je.ValueKind == System.Text.Json.JsonValueKind.String => je.GetString(),
                    _ => null
                };

                if (typeStr == nameof(DiscountValueType.Percentage) &&
                    d.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountValue, out var valueObj))
                {
                    var percentageValue = valueObj switch
                    {
                        decimal dec => dec,
                        double dbl => (decimal)dbl,
                        int i => i,
                        long l => l,
                        string s when decimal.TryParse(s, out var parsed) => parsed,
                        System.Text.Json.JsonElement je when je.ValueKind == System.Text.Json.JsonValueKind.Number =>
                            je.TryGetDecimal(out var dec) ? dec : 0,
                        _ => 0m
                    };

                    if (!string.IsNullOrEmpty(d.DependantLineItemSku))
                    {
                        var linkedItem = productItems.FirstOrDefault(p => p.Sku == d.DependantLineItemSku);
                        if (linkedItem != null)
                        {
                            var linkedTotal = currencyService.Round(linkedItem.Amount * linkedItem.Quantity, currencyCode);
                            discountAmount = -currencyService.Round(linkedTotal * (percentageValue / 100m), currencyCode);
                        }
                    }
                    else
                    {
                        discountAmount = -currencyService.Round(subTotal * (percentageValue / 100m), currencyCode);
                    }
                }
            }
            return discountAmount;
        });

        var afterTaxDiscountContributions = CalculateAfterTaxDiscountContributions(
            afterTaxDiscounts, productItems, taxableItems, subTotal, beforeTaxDiscountOnly, currencyCode);

        var totalTaxableAmount = taxableItems.Sum(li =>
            currencyService.Round(li.Amount * li.Quantity, currencyCode));

        // Calculate tax on discounted amounts
        decimal tax = 0;
        foreach (var lineItem in taxableItems)
        {
            var itemTotal = currencyService.Round(lineItem.Amount * lineItem.Quantity, currencyCode);

            // Find any linked before-tax discount for this item
            var lineItemDiscount = CalculateLinkedDiscountForItem(linkedDiscounts, lineItem, currencyCode);

            // Pro-rate unlinked before-tax discounts across taxable items
            var proRatedUnlinkedDiscount = 0m;
            if (unlinkedBeforeTaxDiscountTotal < 0 && totalTaxableAmount > 0)
            {
                var proportion = itemTotal / totalTaxableAmount;
                proRatedUnlinkedDiscount = currencyService.Round(unlinkedBeforeTaxDiscountTotal * proportion, currencyCode);
            }

            // Get after-tax discount contribution for this item
            var afterTaxContribution = 0m;
            if (!string.IsNullOrEmpty(lineItem.Sku) &&
                afterTaxDiscountContributions.TryGetValue(lineItem.Sku, out var contribution))
            {
                afterTaxContribution = contribution;
            }

            // Tax on discounted amount (includes both before-tax and after-tax discount contributions)
            var taxableAmount = currencyService.Round(
                itemTotal + lineItemDiscount + proRatedUnlinkedDiscount - afterTaxContribution,
                currencyCode);
            taxableAmount = Math.Max(0, taxableAmount);
            tax += currencyService.Round(taxableAmount * (lineItem.TaxRate / 100m), currencyCode);
        }

        // Add shipping tax if applicable
        if (isShippingTaxable && shippingAmount > 0)
        {
            tax += currencyService.Round(shippingAmount * (defaultTaxRate / 100m), currencyCode);
        }

        var total = currencyService.Round(adjustedSubTotal + tax + shippingAmount, currencyCode);
        // Cap discount at subtotal - discount can never exceed what's being purchased
        var discountAbsolute = currencyService.Round(Math.Min(Math.Abs(totalDiscountAmount), subTotal), currencyCode);

        return (subTotal, discountAbsolute, adjustedSubTotal, tax, total, shippingAmount);
    }

    /// <summary>
    /// Calculates the pre-tax discount contribution for each line item from after-tax discounts.
    /// Returns a dictionary mapping SKU to the pre-tax discount amount for that item.
    /// </summary>
    private Dictionary<string, decimal> CalculateAfterTaxDiscountContributions(
        List<LineItem> afterTaxDiscounts,
        List<LineItem> productItems,
        List<LineItem> taxableItems,
        decimal subTotal,
        decimal beforeTaxDiscountTotal,
        string currencyCode)
    {
        var contributions = new Dictionary<string, decimal>();

        foreach (var discount in afterTaxDiscounts)
        {
            var afterTaxDiscountAmount = CalculateAfterTaxDiscountAmount(
                discount, productItems, taxableItems, subTotal, beforeTaxDiscountTotal, currencyCode);

            List<LineItem> applicableItems;
            if (!string.IsNullOrEmpty(discount.DependantLineItemSku))
            {
                var linkedItem = productItems.FirstOrDefault(p => p.Sku == discount.DependantLineItemSku);
                applicableItems = linkedItem != null && linkedItem.IsTaxable ? [linkedItem] : [];
            }
            else
            {
                applicableItems = taxableItems;
            }

            if (applicableItems.Count == 0)
            {
                continue;
            }

            // Calculate each item's after-tax value for pro-rating
            var itemsWithAfterTax = applicableItems.Select(li => new
            {
                LineItem = li,
                PreTaxAmount = currencyService.Round(li.Amount * li.Quantity, currencyCode),
                TaxRate = li.TaxRate / 100m,
                AfterTaxAmount = currencyService.Round(
                    li.Amount * li.Quantity * (1 + (li.TaxRate / 100m)), currencyCode)
            }).ToList();

            var totalAfterTax = itemsWithAfterTax.Sum(x => x.AfterTaxAmount);
            if (totalAfterTax <= 0)
            {
                continue;
            }

            foreach (var item in itemsWithAfterTax)
            {
                var proportion = item.AfterTaxAmount / totalAfterTax;
                var itemAfterTaxDiscount = currencyService.Round(
                    afterTaxDiscountAmount * proportion, currencyCode);
                var itemPreTaxDiscount = currencyService.Round(
                    itemAfterTaxDiscount / (1 + item.TaxRate), currencyCode);

                var sku = item.LineItem.Sku;
                if (!string.IsNullOrEmpty(sku))
                {
                    contributions.TryAdd(sku, 0);
                    contributions[sku] += itemPreTaxDiscount;
                }
            }
        }

        return contributions;
    }

    private decimal CalculateUnlinkedDiscountTotal(
        List<LineItem> discountItems,
        decimal subTotal,
        string currencyCode)
    {
        decimal total = 0;
        foreach (var discount in discountItems.Where(d => string.IsNullOrEmpty(d.DependantLineItemSku)))
        {
            var discountAmount = discount.Amount;

            if (discount.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountValueType, out var typeObj))
            {
                var typeStr = typeObj switch
                {
                    string s => s,
                    System.Text.Json.JsonElement je when je.ValueKind == System.Text.Json.JsonValueKind.String => je.GetString(),
                    _ => null
                };

                if (typeStr == nameof(DiscountValueType.Percentage) &&
                    discount.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountValue, out var valueObj))
                {
                    var percentageValue = valueObj switch
                    {
                        decimal dec => dec,
                        double dbl => (decimal)dbl,
                        int i => i,
                        long l => l,
                        string s when decimal.TryParse(s, out var parsed) => parsed,
                        System.Text.Json.JsonElement je when je.ValueKind == System.Text.Json.JsonValueKind.Number =>
                            je.TryGetDecimal(out var d) ? d : 0,
                        _ => 0m
                    };
                    discountAmount = -currencyService.Round(subTotal * (percentageValue / 100m), currencyCode);
                }
                else if (typeStr == nameof(DiscountValueType.Free))
                {
                    // Order-level free - full subtotal off
                    discountAmount = -subTotal;
                }
            }

            total += discountAmount;
        }
        return total;
    }

    private decimal CalculateLinkedDiscountForItem(
        List<LineItem> linkedDiscounts,
        LineItem lineItem,
        string currencyCode)
    {
        decimal total = 0;
        foreach (var discount in linkedDiscounts.Where(d => d.DependantLineItemSku == lineItem.Sku))
        {
            var discountAmount = discount.Amount;

            if (discount.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountValueType, out var typeObj))
            {
                var typeStr = typeObj switch
                {
                    string s => s,
                    System.Text.Json.JsonElement je when je.ValueKind == System.Text.Json.JsonValueKind.String => je.GetString(),
                    _ => null
                };

                if (typeStr == nameof(DiscountValueType.Percentage) &&
                    discount.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountValue, out var valueObj))
                {
                    var percentageValue = valueObj switch
                    {
                        decimal dec => dec,
                        double dbl => (decimal)dbl,
                        int i => i,
                        long l => l,
                        string s when decimal.TryParse(s, out var parsed) => parsed,
                        System.Text.Json.JsonElement je when je.ValueKind == System.Text.Json.JsonValueKind.Number =>
                            je.TryGetDecimal(out var d) ? d : 0,
                        _ => 0m
                    };
                    var itemTotal = currencyService.Round(lineItem.Amount * lineItem.Quantity, currencyCode);
                    discountAmount = -currencyService.Round(itemTotal * (percentageValue / 100m), currencyCode);
                }
                else if (typeStr == nameof(DiscountValueType.Free))
                {
                    // Free means 100% off the linked item
                    var itemTotal = currencyService.Round(lineItem.Amount * lineItem.Quantity, currencyCode);
                    discountAmount = -itemTotal;
                }
            }

            total += discountAmount;
        }
        return total;
    }

    public List<string> AddDiscountLineItem(
        List<LineItem> lineItems,
        decimal amount,
        DiscountValueType discountValueType,
        string currencyCode,
        string? linkedSku = null,
        string? name = null,
        string? reason = null,
        Dictionary<string, string>? extendedData = null)
    {
        List<string> errors = [];

        if (amount <= 0)
        {
            errors.Add("Discount amount must be greater than zero");
            return errors;
        }

        if (discountValueType == DiscountValueType.Percentage && amount > 100)
        {
            errors.Add("Percentage discount cannot exceed 100%");
            return errors;
        }

        // If linking to a SKU, verify it exists
        if (!string.IsNullOrEmpty(linkedSku))
        {
            var linkedItem = lineItems.FirstOrDefault(li =>
                li.Sku == linkedSku &&
                (li.LineItemType == LineItemType.Product || li.LineItemType == LineItemType.Custom));

            if (linkedItem == null)
            {
                errors.Add($"Cannot link discount to SKU '{linkedSku}' - item not found in line items");
                return errors;
            }
        }

        // Calculate the actual discount amount for storage
        decimal storedAmount;
        if (discountValueType == DiscountValueType.FixedAmount)
        {
            storedAmount = -amount; // Store as negative
        }
        else
        {
            // For percentage/free, we store a placeholder negative amount
            // The actual calculation happens in CalculateFromLineItems
            // We store the value type in ExtendedData
            storedAmount = -amount; // Placeholder - will be recalculated
        }

        var discountLineItem = new LineItem
        {
            Id = Guid.NewGuid(),
            LineItemType = LineItemType.Discount,
            Name = name ?? (discountValueType == DiscountValueType.Percentage ? $"{amount}% discount" : discountValueType == DiscountValueType.Free ? "Free" : "Discount"),
            Sku = $"DISCOUNT-{Guid.NewGuid():N}",
            Amount = storedAmount,
            Quantity = 1,
            IsTaxable = false,
            TaxRate = 0,
            DependantLineItemSku = linkedSku,
            DateCreated = DateTime.UtcNow,
            DateUpdated = DateTime.UtcNow,
            ExtendedData = new Dictionary<string, object>
            {
                [Constants.ExtendedDataKeys.DiscountValueType] = discountValueType.ToString(),
                [Constants.ExtendedDataKeys.DiscountValue] = amount
            }
        };

        if (!string.IsNullOrEmpty(reason))
        {
            discountLineItem.ExtendedData[Constants.ExtendedDataKeys.Reason] = reason;
        }

        // Add any additional extended data
        if (extendedData != null)
        {
            foreach (var kvp in extendedData)
            {
                discountLineItem.ExtendedData[kvp.Key] = kvp.Value;
            }
        }

        lineItems.Add(discountLineItem);
        return errors;
    }

    public bool RemoveDiscountLineItem(List<LineItem> lineItems, Guid discountLineItemId)
    {
        var discount = lineItems.FirstOrDefault(li =>
            li.Id == discountLineItemId && li.LineItemType == LineItemType.Discount);

        if (discount == null)
        {
            return false;
        }

        lineItems.Remove(discount);
        return true;
    }

    /// <summary>
    /// Checks if a discount line item has the ApplyAfterTax flag set.
    /// </summary>
    private static bool IsAfterTaxDiscount(LineItem discount)
    {
        if (discount.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.ApplyAfterTax, out var applyAfterTaxObj))
        {
            return applyAfterTaxObj switch
            {
                bool b => b,
                string s when bool.TryParse(s, out var parsed) => parsed,
                System.Text.Json.JsonElement je when je.ValueKind == System.Text.Json.JsonValueKind.True => true,
                System.Text.Json.JsonElement je when je.ValueKind == System.Text.Json.JsonValueKind.False => false,
                System.Text.Json.JsonElement je when je.ValueKind == System.Text.Json.JsonValueKind.String
                    && bool.TryParse(je.GetString(), out var parsedFromString) => parsedFromString,
                _ => false
            };
        }
        return false;
    }

    /// <summary>
    /// Reverse-calculates the pre-tax discount amount from an after-tax discount.
    /// Pro-rates the discount across taxable items based on their after-tax contribution,
    /// then reverse-calculates each item's pre-tax portion.
    /// </summary>
    private decimal ReverseCalculatePreTaxDiscount(
        decimal afterTaxDiscountAmount,
        List<LineItem> taxableItems,
        string currencyCode)
    {
        if (afterTaxDiscountAmount <= 0 || !taxableItems.Any())
        {
            return 0;
        }

        // Calculate each item's after-tax value
        var itemsWithAfterTax = taxableItems.Select(li => new
        {
            LineItem = li,
            PreTaxAmount = currencyService.Round(li.Amount * li.Quantity, currencyCode),
            TaxRate = li.TaxRate / 100m,
            AfterTaxAmount = currencyService.Round(
                li.Amount * li.Quantity * (1 + li.TaxRate / 100m), currencyCode)
        }).ToList();

        var totalAfterTax = itemsWithAfterTax.Sum(x => x.AfterTaxAmount);

        if (totalAfterTax <= 0)
        {
            return 0;
        }

        decimal totalPreTaxDiscount = 0;

        foreach (var item in itemsWithAfterTax)
        {
            // Pro-rate by after-tax contribution
            var proportion = item.AfterTaxAmount / totalAfterTax;
            var itemAfterTaxDiscount = currencyService.Round(
                afterTaxDiscountAmount * proportion, currencyCode);

            // Reverse-calculate to pre-tax: preTaxDiscount = afterTaxDiscount / (1 + taxRate)
            var itemPreTaxDiscount = currencyService.Round(
                itemAfterTaxDiscount / (1 + item.TaxRate), currencyCode);

            totalPreTaxDiscount += itemPreTaxDiscount;
        }

        return totalPreTaxDiscount;
    }

    /// <summary>
    /// Calculates the after-tax discount amount for a given discount applied to after-tax total.
    /// Takes into account any before-tax discounts already applied.
    /// </summary>
    private decimal CalculateAfterTaxDiscountAmount(
        LineItem discount,
        List<LineItem> productItems,
        List<LineItem> taxableItems,
        decimal subTotal,
        decimal beforeTaxDiscountTotal,
        string currencyCode)
    {
        // Calculate the after-tax total for the items this discount applies to
        // Factor in before-tax discounts that have already been applied
        decimal afterTaxTotal;

        if (!string.IsNullOrEmpty(discount.DependantLineItemSku))
        {
            // Linked to specific product - use the original item amount
            // (linked before-tax discounts would be handled separately)
            var linkedItem = productItems.FirstOrDefault(p => p.Sku == discount.DependantLineItemSku);
            if (linkedItem == null) return 0;

            var itemTotal = currencyService.Round(linkedItem.Amount * linkedItem.Quantity, currencyCode);
            afterTaxTotal = currencyService.Round(itemTotal * (1 + linkedItem.TaxRate / 100m), currencyCode);
        }
        else
        {
            // Order-level - calculate after-tax total based on adjusted subtotal
            // The before-tax discount reduces the base that we calculate after-tax on
            var taxableSubTotal = taxableItems.Sum(li =>
                currencyService.Round(li.Amount * li.Quantity, currencyCode));

            if (taxableSubTotal <= 0) return 0;

            // Pro-rate the before-tax discount across taxable items
            // beforeTaxDiscountTotal is negative, so we add it to get the adjusted amount
            var adjustedTaxableSubTotal = Math.Max(0, taxableSubTotal + beforeTaxDiscountTotal);

            // Calculate weighted average tax rate for the taxable items
            var weightedTaxRate = taxableItems.Sum(li =>
            {
                var itemAmount = currencyService.Round(li.Amount * li.Quantity, currencyCode);
                var weight = itemAmount / taxableSubTotal;
                return weight * (li.TaxRate / 100m);
            });

            // Calculate after-tax total on the adjusted (post-before-tax-discount) amount
            afterTaxTotal = currencyService.Round(adjustedTaxableSubTotal * (1 + weightedTaxRate), currencyCode);
        }

        // Now calculate the discount amount based on the after-tax total
        if (discount.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountValueType, out var typeObj))
        {
            var typeStr = typeObj switch
            {
                string s => s,
                System.Text.Json.JsonElement je when je.ValueKind == System.Text.Json.JsonValueKind.String => je.GetString(),
                _ => null
            };

            if (typeStr == nameof(DiscountValueType.Percentage) &&
                discount.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountValue, out var valueObj))
            {
                var percentageValue = valueObj switch
                {
                    decimal dec => dec,
                    double dbl => (decimal)dbl,
                    int i => i,
                    long l => l,
                    string s when decimal.TryParse(s, out var parsed) => parsed,
                    System.Text.Json.JsonElement je when je.ValueKind == System.Text.Json.JsonValueKind.Number =>
                        je.TryGetDecimal(out var d) ? d : 0,
                    _ => 0m
                };

                return currencyService.Round(afterTaxTotal * (percentageValue / 100m), currencyCode);
            }
            else if (typeStr == nameof(DiscountValueType.FixedAmount))
            {
                // For fixed amount, the discount.Amount already contains the after-tax amount
                return Math.Abs(discount.Amount);
            }
            else if (typeStr == nameof(DiscountValueType.Free))
            {
                // Free = 100% off after tax
                return afterTaxTotal;
            }
        }

        return Math.Abs(discount.Amount);
    }
}

